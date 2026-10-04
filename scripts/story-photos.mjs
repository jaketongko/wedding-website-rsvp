// Prepares the Our Story photos: resizes the couple's originals for the web and
// writes the list the edge function injects.
//
//   source-images/our-story/<event>/<photos>   originals, not in git - always in
//                                              the MAIN checkout (see mainCheckout)
//   public/_wedding/our-story/<event>/<hash>.jpg   resized copies, served
//   netlify/lib/story-photos.generated.ts      which photos belong to which event
//
// <event> is the story's title with everything but letters and digits removed,
// lower-cased: "THE FIRST HELLO" -> thefirsthello. Photos show in file-name
// order, so name them 01-..., 02-.... Files are named by a hash of their
// content, because /_wedding/* is cached as immutable: a replaced photo gets a
// new URL instead of staying stale in guests' caches.
//
// Runs as the Netlify build command (netlify.toml), so every
// `netlify deploy --build` picks up added or removed photos. Also `npm run photos`.
// STORY_SRC overrides the source folder (used for testing).

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

for (const dir of events) {
  const key = keyOf(dir.name);
  if (!key) continue;
  const files = fs
    .readdirSync(path.join(SRC, dir.name))
    .filter((f) => PHOTO.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;

  fs.mkdirSync(path.join(OUT, key), { recursive: true });
  list[key] = [];
  for (const file of files) {
    const source = path.join(SRC, dir.name, file);
    const hash = createHash("sha1")
      .update(fs.readFileSync(source))
      .update(`${MAX_EDGE}/${QUALITY}`)
      .digest("hex")
      .slice(0, 12);
    const out = path.join(OUT, key, `${hash}.jpg`);
    if (!fs.existsSync(out)) {
      ffmpeg ??= findFfmpeg();
      // Shrinks only, never enlarges; strips metadata (location included).
      // ffmpeg applies a phone photo's EXIF rotation itself.
      execFileSync(ffmpeg, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", source,
        "-vf", `scale='min(${MAX_EDGE},iw)':'min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease`,
        "-q:v", String(QUALITY),
        "-map_metadata", "-1",
        "-frames:v", "1",
        out,
      ]);
      made++;
    }
    list[key].push(`${URL_BASE}/${key}/${hash}.jpg`);
  }
}

// Drop resized copies whose original is gone. Only ever inside OUT, which
// this script owns.
if (fs.existsSync(OUT)) {
  for (const key of fs.readdirSync(OUT)) {
    const dir = path.join(OUT, key);
    if (!fs.statSync(dir).isDirectory()) continue;
    const keep = new Set((list[key] || []).map((u) => path.basename(u)));
    for (const f of fs.readdirSync(dir)) if (!keep.has(f)) fs.rmSync(path.join(dir, f));
    if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  }
}

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
