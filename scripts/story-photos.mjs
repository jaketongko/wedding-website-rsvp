// Prepares the Our Story and /main slideshow photos: resizes the couple's
// originals for the web and writes the lists the edge function injects.
//
//   source-images/our-story/<event>/<photos>   originals, not in git - always in
//                                              the MAIN checkout (see mainCheckout)
//   public/_wedding/our-story/<event>/<hash>.jpg   resized copies, served
//   netlify/lib/story-photos.generated.ts      which photos belong to which event
//
//   source-images/slideshow/<photos>           slideshow originals, flat folder
//   public/_wedding/slideshow/<hash>.jpg       resized copies, served
//   netlify/lib/slideshow-photos.generated.ts  the slideshow list, with sizes
//
// <event> is the story's title with everything but letters and digits removed,
// lower-cased: "THE FIRST HELLO" -> thefirsthello. Photos show in file-name
// order, so name them 01-..., 02-.... Files are named by a hash of their
// content, because /_wedding/* is cached as immutable: a replaced photo gets a
// new URL instead of staying stale in guests' caches.
//
// Runs as the Netlify build command (netlify.toml), so every
// `netlify deploy --build` picks up added or removed photos. Also `npm run photos`.
// STORY_SRC and SLIDESHOW_SRC override the source folders (used for testing).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The main checkout (C:\Workspaces\wedding-website-rsvp), where the couple keeps
 * the originals - even when this runs in a linked worktree, as production
 * deploys do (the ...-live worktree). Git's shared directory is the main
 * checkout's .git; outside git, this checkout.
 */
function mainCheckout() {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return path.dirname(common);
  } catch {
    return ROOT;
  }
}

const SRC = path.resolve(process.env.STORY_SRC || path.join(mainCheckout(), "source-images", "our-story"));
const OUT = path.join(ROOT, "public", "_wedding", "our-story");
const LIST = path.join(ROOT, "netlify", "lib", "story-photos.generated.ts");
const URL_BASE = "/_wedding/our-story";

const SLIDE_SRC = path.resolve(process.env.SLIDESHOW_SRC || path.join(mainCheckout(), "source-images", "slideshow"));
const SLIDE_OUT = path.join(ROOT, "public", "_wedding", "slideshow");
const SLIDE_LIST = path.join(ROOT, "netlify", "lib", "slideshow-photos.generated.ts");
const SLIDE_URL_BASE = "/_wedding/slideshow";
/** Long edge, px, for a full-screen photo: covers a 1080p screen at 1.25x. */
const SLIDE_MAX_EDGE = 2400;

/** Long edge, px. A card photo shows at ~450px wide; this covers 3x screens. */
const MAX_EDGE = 1600;
/** ffmpeg's JPEG quality scale: 2 (best) to 31. 4 is visually clean at ~1/10 the size. */
const QUALITY = 4;
const PHOTO = /\.(jpe?g|png|webp)$/i;

const keyOf = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** ffmpeg-static from this checkout, or from the main worktree beside it (the
 *  live worktree has no node_modules of its own). */
function findFfmpeg() {
  for (const base of [ROOT, path.join(ROOT, "..", "wedding-website-rsvp")]) {
    try {
      const bin = createRequire(path.join(base, "package.json"))("ffmpeg-static");
      if (bin && fs.existsSync(bin)) return bin;
    } catch {
      // try the next one
    }
  }
  throw new Error("ffmpeg-static not found - run `npm install` in the repo first.");
}

const events = fs.existsSync(SRC)
  ? fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];

let ffmpeg = null;
const list = {};
let made = 0;

const photosIn = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => PHOTO.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

/** Resizes one original into outDir (if not done before); returns the file name. */
function resize(source, outDir, maxEdge) {
  const hash = createHash("sha1")
    .update(fs.readFileSync(source))
    .update(`${maxEdge}/${QUALITY}`)
    .digest("hex")
    .slice(0, 12);
  const name = `${hash}.jpg`;
  const out = path.join(outDir, name);
  if (!fs.existsSync(out)) {
    ffmpeg ??= findFfmpeg();
    fs.mkdirSync(outDir, { recursive: true });
    // Shrinks only, never enlarges; strips metadata (location included).
    // ffmpeg applies a phone photo's EXIF rotation itself.
    execFileSync(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", source,
      "-vf", `scale='min(${maxEdge},iw)':'min(${maxEdge},ih)':force_original_aspect_ratio=decrease`,
      "-q:v", String(QUALITY),
      "-map_metadata", "-1",
      "-frames:v", "1",
      out,
    ]);
    made++;
  }
  return name;
}

/** Deletes the files in dir not in keep, and dir itself once empty. Only ever
 *  called on folders this script owns. */
function prune(dir, keep) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!keep.has(f) && fs.statSync(path.join(dir, f)).isFile()) fs.rmSync(path.join(dir, f));
  }
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

/** Width and height from a JPEG's frame header (ffmpeg writes baseline SOF0). */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  for (let i = 2; i + 9 < b.length && b[i] === 0xff; i += 2 + b.readUInt16BE(i + 2)) {
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
  }
  throw new Error(`No JPEG frame header in ${file}`);
}

for (const dir of events) {
  const key = keyOf(dir.name);
  if (!key) continue;
  const files = photosIn(path.join(SRC, dir.name));
  if (!files.length) continue;
  list[key] = files.map(
    (file) => `${URL_BASE}/${key}/${resize(path.join(SRC, dir.name, file), path.join(OUT, key), MAX_EDGE)}`,
  );
}

// Drop resized copies whose original is gone.
if (fs.existsSync(OUT)) {
  for (const key of fs.readdirSync(OUT)) {
    const dir = path.join(OUT, key);
    if (fs.statSync(dir).isDirectory()) prune(dir, new Set((list[key] || []).map((u) => path.basename(u))));
  }
}

// The /main slideshow: one flat folder, its own output, its own list.
const slides = (fs.existsSync(SLIDE_SRC) ? photosIn(SLIDE_SRC) : []).map((file) => {
  const name = resize(path.join(SLIDE_SRC, file), SLIDE_OUT, SLIDE_MAX_EDGE);
  return { src: `${SLIDE_URL_BASE}/${name}`, ...jpegSize(path.join(SLIDE_OUT, name)) };
});
prune(SLIDE_OUT, new Set(slides.map((s) => path.basename(s.src))));

fs.writeFileSync(
  SLIDE_LIST,
  "// Generated by scripts/story-photos.mjs - do not edit; run `npm run photos`.\n" +
    "// The /main slideshow photos, in file-name order, from source-images/slideshow/.\n" +
    "// Fewer than 2 and the slideshow uses the Canva Gallery grid instead.\n" +
    `export const SLIDESHOW_PHOTOS: { src: string; w: number; h: number }[] = ${JSON.stringify(slides, null, 2)};\n`,
);
console.log(`[story-photos] ${slides.length} slideshow photo(s) from ${path.relative(ROOT, SLIDE_SRC) || SLIDE_SRC}.`);

fs.writeFileSync(
  LIST,
  "// Generated by scripts/story-photos.mjs - do not edit; run `npm run photos`.\n" +
    "// Our Story photos per event, keyed by the event title with only letters and\n" +
    "// digits kept, lower-cased (\"THE FIRST HELLO\" -> thefirsthello).\n" +
    `export const STORY_PHOTOS: Record<string, string[]> = ${JSON.stringify(list, null, 2)};\n`,
);

const total = Object.values(list).reduce((n, l) => n + l.length, 0);
console.log(
  `[story-photos] ${total} photo(s) in ${Object.keys(list).length} event(s)` +
    ` from ${path.relative(ROOT, SRC) || SRC}; ${made} newly resized.`,
);
