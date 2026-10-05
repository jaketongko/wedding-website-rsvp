/**
 * The RSVP page, rebuilt as one section of our own on a touch of lavender:
 *
 *   nav (desktop; the phone menu stands in on phones, menu.ts)
 *   a centred opening: Canva's "Please RSVP" and the Canva envelope, with the
 *     reply-by date and the ask in a bubble beneath it
 *   "Things to know" (save the date, let us know, dress code, the venue) beside
 *     the RSVP form; stacked on narrow screens
 *
 * Why our own form at all: Canva's form widget redirects to
 * `https://www.canva.com/_website-element-widget`, which answers with
 * `x-frame-options: deny` and a `frame-ancestors` allowlist naming only
 * `shan-and-jake-wedding.my.canva.site`, so a proxied copy of the page can
 * never show it.
 *
 * Canva's own RSVP section (title, envelope, the broken widget) is held
 * invisible from the first moment on the route, read for its title, nav,
 * envelope images and paper background, then hidden; ours takes its place.
 * If it cannot be read, ours is still built, with plain defaults; and if
 * Canva never draws the page at all, a floating RSVP button opens the same
 * form, so there is ALWAYS a way to reply.
 *
 * Submissions go to Netlify Forms. The field names here MUST match
 * public/_forms/rsvp.html, which is what registers the form at deploy time.
 *
 * Injected on every page and scoped to /rsvp at runtime: Canva routes
 * client-side, so arriving at /rsvp from the invitation fires no page load.
 */
import { MOBILE } from "./player.ts";

const ENDPOINT = "/_forms/rsvp.html";

/** The reply-by date shown on the page. */
const REPLY_BY = "December 31, 2026";

/**
 * "The Seasons", the invitation's own typeface. Not self-hosted: these are the
 * files Canva already serves for the design, reached same-origin through the
 * proxy. The paths are content hashes read from Canva's page data; if the couple
 * drops the font from the design they disappear and the form falls back to
 * Georgia. Our own family name avoids colliding with whatever Canva registers.
 */
const SEASONS_FACES: Array<[weight: number, style: string, hash: string]> = [
  [300, "normal", "694ad324e926bca090d158ea2c4730c6"],
  [300, "italic", "c2db0b6c0c129d362eb609bedbaa8f64"],
  [400, "normal", "8dcc63e6bd4f6d41561f68dbc75529a1"],
  [400, "italic", "f9026ee74bca9e958959f14f08c41f48"],
  [700, "normal", "238919b47920553d7b287ec007d67e76"],
  [700, "italic", "cfcbcaabc41291782c1541b9c6e97ce8"],
];

const FONT_FACES = SEASONS_FACES.map(
  ([weight, style, hash]) => `
  @font-face {
    font-family: "SJ The Seasons";
    src: url("/_assets/fonts/${hash}.woff") format("woff");
    font-weight: ${weight};
    font-style: ${style};
    font-display: swap;
  }`,
).join("");

// Interpolated raw: wrapping it in JSON.stringify quotes the whole stack as ONE
// family name, which matches nothing and drops to the browser default font.
// Exported so the rest of the site uses the same type. The @font-face rules
// above ship in this module's <style>, which is injected on every page, so the
// family is registered site-wide and no one else needs to declare it.
export const FONT = '"SJ The Seasons", Georgia, "Times New Roman", serif';

/**
 * The RSVP page's faces: Playfair Display for reminder titles and the date, Lato
 * for everything read, Marcellus for headings and The Seasons (FONT) for the two
 * answers. Canva's own "Please RSVP" title and nav keep the invitation's fonts.
 */
const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const SANS = '"Lato", "Helvetica Neue", Arial, sans-serif';
/** Marcellus, the face of the couple's page titles in Canva, from the file Canva
 *  serves for the design (same-origin through the proxy, like The Seasons). */
const HEADING = '"SJ Marcellus", "Marcellus", Georgia, serif';

/** In <head> on every page (Canva routes client-side, so a guest can reach
 *  /rsvp without a page load); `display=swap` shows the fallbacks meanwhile. */
export const RSVP_FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;500&display=swap">';

/** Lavender flower colours: buds darken toward the base of each spike. Shared
 * with the falling petals (petals.ts) so the site uses one lavender. */
export const LAVENDER = {
  buds: ["#a47fc4", "#b896d4", "#cdb3e4"],
  stem: "#b9c3a0",
  leaf: "#cfd8b9",
};

type Pt = { x: number; y: number };
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A lavender sprig: a gently curved stem (quadratic p0 -> c -> p1) ending in a
 * spike of buds that pair off along its upper half and shrink toward the tip.
 * Generated so buds stay evenly spaced on any curve.
 */
function lavenderSprig(p0: Pt, c: Pt, p1: Pt, buds: number, size: number, stemWidth: number): string {
  const at = (t: number): Pt => ({
    x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p1.x,
    y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p1.y,
  });
  // Direction of travel along the stem, in SVG degrees (clockwise from +x).
  const heading = (t: number) =>
    (Math.atan2(
      2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y),
      2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x),
    ) * 180) / Math.PI;
  const bud = (x: number, y: number, rx: number, angle: number, fill: string) =>
    `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(rx)}" ry="${r2(rx * 0.56)}" ` +
    `transform="rotate(${r2(angle)} ${r2(x)} ${r2(y)})" fill="${fill}"/>`;

  let svg =
    `<path d="M${p0.x} ${p0.y}Q${c.x} ${c.y} ${p1.x} ${p1.y}" fill="none" ` +
    `stroke="${LAVENDER.stem}" stroke-width="${stemWidth}" stroke-linecap="round"/>`;
  for (let i = 0; i < buds; i++) {
    const f = i / (buds - 1); // 0 at the base of the spike, 1 at the tip
    const p = at(0.52 + 0.46 * f);
    const a = heading(0.52 + 0.46 * f);
    const rx = size * (1 - 0.5 * f);
    const fill = LAVENDER.buds[Math.min(LAVENDER.buds.length - 1, Math.floor(f * LAVENDER.buds.length))];
    for (const side of [-1, 1]) {
      const n = ((a + 90 * side) * Math.PI) / 180;
      svg += bud(p.x + Math.cos(n) * rx * 0.55, p.y + Math.sin(n) * rx * 0.55, rx, a + 38 * side, fill);
    }
  }
  return svg + bud(p1.x, p1.y, size * 0.5, heading(1), LAVENDER.buds[LAVENDER.buds.length - 1]);
}

/** Small bundle of three lavender sprigs: beside headings, and on the thank-you. */
const BLOOM = `
<svg class="sjr-bloom" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  ${lavenderSprig({ x: 16, y: 31 }, { x: 13, y: 20 }, { x: 8, y: 5 }, 5, 2.3, 0.9)}
  ${lavenderSprig({ x: 16, y: 31 }, { x: 16, y: 18 }, { x: 16, y: 2 }, 6, 2.5, 0.9)}
  ${lavenderSprig({ x: 16, y: 31 }, { x: 19, y: 20 }, { x: 24, y: 5 }, 5, 2.3, 0.9)}
</svg>`;

const icon = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ` +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

/** The reminder cards. Wording kept here, beside the reply-by date: none of it
 *  is in the Canva design. Date, place and dress code match the Details page. */
const REMINDERS: Array<{ icon: string; title: string; text: string }> = [
  {
    icon: icon('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    title: "Save the date",
    text: "Sunday, 7 February 2027 &middot; ceremony at 3:00 PM",
  },
  {
    icon: icon('<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
    title: "Let us know",
    text: "Tell us whether you can join the celebration",
  },
  {
    icon: icon('<path d="M10 5.2a2 2 0 1 1 2 2v1.3"/><path d="M12 8.5 3.7 15.1a1.3 1.3 0 0 0 .8 2.4h15a1.3 1.3 0 0 0 .8-2.4z"/>'),
    title: "Dress code",
    text: "Formal attire in soft pastel tones",
  },
  {
    icon: icon('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    title: "The venue",
    text: "Nuuk Taal &middot; Laurel, Batangas",
  },
];

const SEND_ICON = icon('<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5z"/>');

/**
 * Sized in em from the section's own base size (16px, divided by Canva's page
 * scale where it shrinks the page on a narrow phone). Never rem - Canva sets
 * `html { font-size: 10px }`.
 */
const styles = (heroSelector: string) => `${FONT_FACES}
  @font-face {
    font-family: "SJ Marcellus";
    src: url("/_assets/fonts/01b954d135aa736b118b66f4429ea154.woff") format("woff");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  /* Canva's RSVP section is held invisible from the first moment on the
     route, while ours is built. */
  ${heroSelector} { visibility: hidden !important; }
  section.sjr-reading {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 100%;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #sj-rsvp-page, #sj-rsvp {
    --sjr-ink: #3f3a38;
    --sjr-muted: #77706c;
    --sjr-accent: #8a6aa8;
    --sjr-accent-rgb: 138, 106, 168;
    --sjr-soft: #b9a0d0;
    --sjr-line: rgba(164, 127, 196, 0.45);
    --sjr-card: #fffefd;
    color: var(--sjr-ink);
    font-family: ${SANS};
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }
  #sj-rsvp-page {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    padding: 6em 1.5em 5em;
    background-color: #f6f3f7;
    background-position: center top;
    background-size: cover;
  }
  #sj-rsvp-page * { box-sizing: border-box; }
  #sj-rsvp-page .sjr-inner { max-width: 68em; margin: 0 auto; }

  /* A display serif for reminder titles and the date; Lato (above) for the rest. */
  #sj-rsvp-page .sjr-serif, #sj-rsvp .sjr-serif { font-family: ${SERIF}; font-weight: 400; }
  /* The form's headings: Marcellus, as the couple titles their pages in Canva. */
  #sj-rsvp-page .sjr-heading, #sj-rsvp .sjr-heading { font-family: ${HEADING}; font-weight: 400; letter-spacing: 0.02em; }

  /* ---------- nav (desktop) ---------- */
  #sj-rsvp-page .sjr-nav {
    position: absolute;
    top: 6em;
    left: 0;
    right: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6em 2.2em;
    padding: 0 1.25em;
  }
  #sj-rsvp-page .sjr-nav > * {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font-size: 0.75em;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 220ms ease;
  }
  #sj-rsvp-page .sjr-nav > span { cursor: default; }
  @media (hover: hover) and (pointer: fine) {
    #sj-rsvp-page .sjr-nav > button:hover { opacity: 0.55; }
  }
  #sj-rsvp-page.sjr-has-nav { padding-top: 10em; }

  /* ---------- the opening: centred title, the envelope under an arch ---------- */
  #sj-rsvp-page .sjr-hero { text-align: center; }
  #sj-rsvp-page .sjr-title { margin: 0; line-height: 0.9; font-weight: 400; }
  #sj-rsvp-page .sjr-please { display: block; font-size: 5em; line-height: 1; margin-bottom: -0.12em; }
  #sj-rsvp-page .sjr-rsvp { display: block; font-size: 4.6em; letter-spacing: 0.1em; text-transform: uppercase; }
  /* The envelope on its own, straight on the paper. */
  #sj-rsvp-page .sjr-envelope { width: min(26em, 100%); margin: 2.6em auto 0; }
  /* Canva's envelope pieces, laid out as Canva lays them, scaled to fit. */
  #sj-rsvp-page .sjr-art { position: relative; width: 100%; margin: 0 auto; }
  #sj-rsvp-page .sjr-clip { position: absolute; overflow: hidden; }
  #sj-rsvp-page .sjr-art img {
    position: absolute;
    display: block;
    opacity: 0;
    transition: opacity 600ms ease;
  }
  #sj-rsvp-page .sjr-art img.is-loaded { opacity: 1; }
  /* The reply-by date and the ask, a bubble under the envelope. Three lines
     tall, so a rounded card rather than a full pill, whose ends would crowd the
     text. */
  #sj-rsvp-page .sjr-badge {
    position: relative;
    display: inline-block;
    max-width: 100%;
    margin: 1.8em 0 0;
    padding: 1.1em 2.6em 1.2em;
    background: #fff;
    border: 1px solid var(--sjr-line);
    border-radius: 2.4em;
    box-shadow: 0 0.8em 2em rgba(110, 80, 140, 0.12);
  }
  #sj-rsvp-page .sjr-badge-label {
    display: block;
    font-size: 0.72em;
    letter-spacing: 0.36em;
    text-transform: uppercase;
    color: var(--sjr-muted);
  }
  #sj-rsvp-page .sjr-date {
    display: block;
    margin-top: 0.15em;
    font-size: 1.7em;
    letter-spacing: 0.04em;
    color: var(--sjr-ink);
  }
  #sj-rsvp-page .sjr-badge-note {
    display: block;
    max-width: 22em;
    margin: 0.7em auto 0;
    font-size: 0.95em;
    font-weight: 300;
    line-height: 1.6;
    text-wrap: balance;
    color: var(--sjr-muted);
  }

  /* ---------- below: good to know | the form ---------- */
  #sj-rsvp-page .sjr-body {
    display: grid;
    grid-template-columns: minmax(0, 19em) minmax(0, 1fr);
    gap: 3.5em;
    align-items: start;
    margin-top: 4.5em;
  }
  #sj-rsvp-page .sjr-notes { padding-top: 1.2em; }
  #sj-rsvp-page .sjr-notes-title {
    margin: 0 0 0.3em;
    font-size: 2.1em;
    line-height: 1.2;
    color: var(--sjr-ink);
  }
  #sj-rsvp-page .sjr-notes .sjr-notes-sub {
    margin: 0 0 1.6em;
    font-size: 0.95em;
    font-weight: 300;
    color: var(--sjr-muted);
  }
  #sj-rsvp-page .sjr-notes ul { margin: 0; padding: 0; list-style: none; }
  #sj-rsvp-page .sjr-notes li {
    display: grid;
    grid-template-columns: 2.6em minmax(0, 1fr);
    gap: 1em;
    align-items: start;
    padding: 1.15em 0;
    border-top: 1px solid var(--sjr-line);
  }
  #sj-rsvp-page .sjr-notes li:last-child { border-bottom: 1px solid var(--sjr-line); }
  #sj-rsvp-page .sjr-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.6em;
    height: 2.6em;
    border: 1px solid var(--sjr-line);
    border-radius: 50%;
    color: var(--sjr-accent);
    background: #fff;
  }
  #sj-rsvp-page .sjr-icon svg { width: 1.2em; height: 1.2em; }
  #sj-rsvp-page .sjr-notes h3 {
    margin: 0.15em 0 0.3em;
    font-size: 0.9em;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--sjr-ink);
  }
  #sj-rsvp-page .sjr-notes p {
    margin: 0;
    font-size: 0.98em;
    font-weight: 300;
    line-height: 1.6;
    color: var(--sjr-muted);
  }

  /* ---------- the form ---------- */
  #sj-rsvp { position: relative; font-size: 16px; }
  #sj-rsvp-page #sj-rsvp { font-size: 1em; }
  #sj-rsvp * { box-sizing: border-box; }
  #sj-rsvp #sj-rsvp-card {
    position: relative;
    padding: 2.6em 2.8em 2em;
    background: var(--sjr-card);
    border: 1px solid var(--sjr-line);
    border-radius: 1.6em;
    box-shadow: 0 1em 2.6em rgba(60, 50, 45, 0.06);
  }
  #sj-rsvp .sjr-form-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1em;
    margin-bottom: 1.5em;
  }
  #sj-rsvp .sjr-form-title {
    margin: 0;
    font-size: 2.1em;
    line-height: 1.2;
    color: var(--sjr-ink);
  }
  #sj-rsvp .sjr-bloom { width: 2.4em; height: 2.4em; flex: none; }
  #sj-rsvp .sjr-field { margin-bottom: 1.5em; }
  #sj-rsvp .sjr-label {
    display: block;
    margin-bottom: 0.8em;
    font-size: 0.78em;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--sjr-muted);
  }
  #sj-rsvp .sjr-req { margin-left: 0.3em; color: var(--sjr-muted); }
  #sj-rsvp input[type="text"],
  #sj-rsvp textarea {
    width: 100%;
    padding: 0.85em 1.3em;
    font-family: ${SANS};
    font-weight: 400;
    /* px, not em/rem: 16px is the minimum that stops iOS Safari zooming the
       page when a field takes focus. */
    font-size: 16px;
    line-height: 1.5;
    color: var(--sjr-ink);
    background: #fff;
    border: 1px solid var(--sjr-line);
    border-radius: 999px;
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }
  #sj-rsvp textarea { border-radius: 1.1em; resize: vertical; min-height: 6.5em; }
  #sj-rsvp input::placeholder, #sj-rsvp textarea::placeholder { color: #b7abc1; font-weight: 300; }
  #sj-rsvp input:focus, #sj-rsvp textarea:focus {
    outline: none;
    border-color: var(--sjr-soft);
    box-shadow: 0 0 0 4px rgba(var(--sjr-accent-rgb), 0.12);
  }

  /* Attendance: two cards side by side, each a title and a soft line. */
  #sj-rsvp .sjr-choices { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9em; }
  #sj-rsvp .sjr-choice {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1em;
    padding: 1em 1.2em;
    background: #fff;
    border: 1px solid var(--sjr-line);
    border-radius: 1.1em;
    cursor: pointer;
    transition: border-color 180ms ease, background-color 180ms ease;
  }
  #sj-rsvp .sjr-choice:hover { border-color: var(--sjr-soft); }
  #sj-rsvp .sjr-choice input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
  #sj-rsvp .sjr-mark {
    flex: none;
    width: 1.2em;
    height: 1.2em;
    border: 1.5px solid var(--sjr-soft);
    border-radius: 50%;
    background: #fff;
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }
  /* The invitation's own face, The Seasons, for the two answers. */
  #sj-rsvp .sjr-choice-title {
    display: block;
    font-family: ${FONT};
    font-size: 1.05em;
    line-height: 1.3;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    /* The Seasons runs wide; without this a wrap strands "IT" on its own line. */
    text-wrap: balance;
    color: var(--sjr-ink);
  }
  #sj-rsvp .sjr-choice-sub { display: block; margin-top: 0.25em; font-size: 0.95em; font-weight: 300; color: var(--sjr-muted); }
  #sj-rsvp .sjr-choice--on {
    border-color: var(--sjr-accent);
    background: #fff;
  }
  #sj-rsvp .sjr-choice--on .sjr-mark {
    border-color: var(--sjr-accent);
    box-shadow: inset 0 0 0 0.25em #fff;
    background: var(--sjr-accent);
  }
  #sj-rsvp .sjr-choice:focus-within { box-shadow: 0 0 0 4px rgba(var(--sjr-accent-rgb), 0.12); }

  #sj-rsvp .sjr-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.9em;
    width: 100%;
    margin-top: 0.6em;
    padding: 1.1em 1.5em;
    font-family: ${SERIF};
    font-size: 0.95em;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #fff;
    background: linear-gradient(135deg, #c3aadb 0%, #9c7dbd 100%);
    border: 0;
    border-radius: 999px;
    box-shadow: 0 0.6em 1.6em rgba(var(--sjr-accent-rgb), 0.28);
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }
  #sj-rsvp .sjr-submit svg { width: 1.3em; height: 1.3em; }
  #sj-rsvp .sjr-submit:hover { filter: brightness(1.04); transform: translateY(-1px); }
  #sj-rsvp .sjr-submit:active { transform: none; }
  #sj-rsvp .sjr-submit[disabled] { opacity: 0.6; cursor: default; transform: none; }
  #sj-rsvp .sjr-required-note {
    margin: 1em 0 0;
    text-align: center;
    font-size: 0.88em;
    font-weight: 300;
    color: var(--sjr-muted);
  }
  #sj-rsvp .sjr-required-note .sjr-req { margin: 0; }
  #sj-rsvp .sjr-note { margin: 0.9em 0 0; text-align: center; font-size: 0.95em; line-height: 1.5; }
  #sj-rsvp .sjr-note:empty { display: none; }
  #sj-rsvp .sjr-note--error { color: #a3456a; }
  #sj-rsvp .sjr-note a { color: var(--sjr-accent); }
  #sj-rsvp .sjr-hp { position: absolute; left: -9999px; opacity: 0; }

  #sj-rsvp .sjr-done { padding: 2.5em 1em; text-align: center; }
  #sj-rsvp .sjr-done .sjr-bloom { display: block; width: 3.2em; height: 3.2em; margin: 0 auto 1em; }
  #sj-rsvp .sjr-done h2 { margin: 0 0 0.4em; font-size: 2.3em; color: var(--sjr-ink); }
  #sj-rsvp .sjr-done p { margin: 0; font-size: 1.05em; font-weight: 300; line-height: 1.7; color: var(--sjr-muted); }

  /* ---------- the fallback: a floating button and the form in a modal ---------- */
  #sj-rsvp.sjr-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483100;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2em 1em;
    overflow-y: auto;
    background: rgba(66, 52, 80, 0.45);
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }
  #sj-rsvp.sjr-overlay #sj-rsvp-card { width: 100%; max-width: 46em; }
  #sj-rsvp .sjr-close {
    position: absolute;
    top: 0.6em;
    right: 0.8em;
    width: 2.2em;
    height: 2.2em;
    font-size: 1.2em;
    color: var(--sjr-muted);
    background: none;
    border: 0;
    cursor: pointer;
  }
  #sj-rsvp-open {
    position: fixed;
    left: 50%;
    bottom: max(1rem, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 2147482000;
    padding: 0.85rem 2.4rem;
    font-family: ${SERIF};
    font-size: 12px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #fff;
    background: #8a6aa8;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(66, 52, 80, 0.3);
  }

  /* ---------- tablets and phones ---------- */
  @media (max-width: 900px) {
    #sj-rsvp-page .sjr-body { grid-template-columns: 1fr; gap: 2.4em; margin-top: 3.5em; }
    #sj-rsvp-page .sjr-notes { padding-top: 0; }
    #sj-rsvp-page .sjr-notes-head { text-align: center; }
    #sj-rsvp-page .sjr-notes ul { display: grid; grid-template-columns: 1fr 1fr; column-gap: 2em; }
    #sj-rsvp-page .sjr-notes li:nth-last-child(2) { border-bottom: 1px solid var(--sjr-line); }
  }
  @media (max-width: 720px) {
    #sj-rsvp-page { padding: 5em 1em 3.5em; }
    #sj-rsvp-page .sjr-please { font-size: 4em; }
    #sj-rsvp-page .sjr-rsvp { font-size: 3.6em; }
    #sj-rsvp-page .sjr-envelope { margin-top: 2em; }
    #sj-rsvp-page .sjr-badge { padding: 0.95em 1.6em 1.05em; border-radius: 1.8em; }
    #sj-rsvp-page .sjr-date { font-size: 1.45em; }
    #sj-rsvp-page .sjr-notes-title { font-size: 1.7em; }
    #sj-rsvp-page .sjr-notes ul { grid-template-columns: 1fr; }
    #sj-rsvp-page .sjr-notes li:nth-last-child(2) { border-bottom: 0; }
    #sj-rsvp #sj-rsvp-card { padding: 1.8em 1.3em 1.5em; }
    #sj-rsvp .sjr-form-title { font-size: 1.7em; }
    #sj-rsvp .sjr-choices { grid-template-columns: 1fr; gap: 0.7em; }
    #sj-rsvp .sjr-submit { letter-spacing: 0.22em; }
  }
  /* Phones: the menu button (menu.ts) stands in for the nav row. */
  @media ${MOBILE} {
    #sj-rsvp-page .sjr-nav { display: none; }
    #sj-rsvp-page.sjr-has-nav { padding-top: 5em; }
  }
`;

/** ES5 on purpose, like the other injected scripts: no build step transpiles it. */
const script = (pages: Record<string, string>, sections: Record<string, string[]>) => `
(function () {
  var ENDPOINT = ${JSON.stringify(ENDPOINT)};
  var PAGES = ${JSON.stringify(pages)};
  var SECTIONS = ${JSON.stringify(sections)};
  var BLOOM = ${JSON.stringify(BLOOM)};
  var SEND_ICON = ${JSON.stringify(SEND_ICON)};
  var REPLY_BY = ${JSON.stringify(REPLY_BY)};
  var REMINDERS = ${JSON.stringify(REMINDERS)};
  var FALLBACK_FONT = ${JSON.stringify(FONT)};
  var READ_WAIT = 6000;   // for Canva's title and envelope before building with what there is
  var FALLBACK_AFTER = 12000;
  var ART_MAX = 17;       // em: the tallest the envelope art may be

  var page = null;        // our section
  var canva = null;       // Canva's RSVP section, hidden behind ours
  var since = 0;          // arrival on the route
  var fallback = null;    // the floating RSVP button
  var built = false;
  var artCount = -1, artSince = 0;

  function slug() { return location.pathname.replace(/^\\/+|\\/+$/g, ""); }
  function onRoute() { return /^(rsvp|_preview-rsvp)(-.*)?$/i.test(slug()); }
  function preview() { return slug() === "_preview-rsvp"; }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function look(node) {
    var cs = getComputedStyle(node.querySelector("span") || node);
    return { font: cs.fontFamily, size: parseFloat(cs.fontSize), color: cs.color };
  }

  /* Canva's RSVP section: by id when the page data lists it (during a page
     change the old page is still in the document). */
  function canvaSection() {
    var ids = SECTIONS[slug()] || SECTIONS.rsvp;
    if (ids && ids.length && !preview()) return document.getElementById(ids[0]);
    return null;
  }

  /* "#page-2" -> "/details", from Canva's page numbers; null if unknown. */
  function pathFor(href) {
    var m = /^#page-(\\d+)$/.exec(href || "");
    var s = m ? PAGES[m[1]] : null;
    return s == null ? null : "/" + s;
  }

  /**
   * What we need from Canva's section: the nav, the title (its two biggest
   * lines - "Please" and "RSVP"), the envelope (every image that is neither
   * the page background nor tiny, with where Canva puts it) and the paper
   * background. Null until the text is laid out and styled.
   */
  function readCanva(section) {
    var sr = section.getBoundingClientRect();
    if (!sr.width) return null;
    var links = section.querySelectorAll('a[href^="#page-"]');
    var tops = [];
    for (var l = 0; l < links.length; l++) {
      var lr = links[l].getBoundingClientRect();
      if (!lr.width) return null;
      tops.push(lr.top);
    }
    var nav = [], lines = [];
    var ps = section.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      var text = (ps[i].textContent || "").replace(/\\s+/g, " ").trim();
      var r = ps[i].getBoundingClientRect();
      if (!text || !r.width) continue;
      var item = { text: text, top: r.top, left: r.left, look: look(ps[i]) };
      var isNav = false;
      for (var t = 0; t < tops.length; t++) if (Math.abs(r.top - tops[t]) < 8) isNav = true;
      if (isNav) {
        var a = ps[i].closest("a") || ps[i].querySelector("a");
        item.href = a ? a.getAttribute("href") : null;
        nav.push(item);
      } else {
        lines.push(item);
      }
    }
    lines.sort(function (a, b) { return b.look.size - a.look.size; });
    var title = lines.slice(0, 2).sort(function (a, b) { return a.top - b.top; });
    if (title.length === 2 && title[0].look.size < 30) return null; // not styled yet
    nav.sort(function (a, b) { return Math.abs(a.top - b.top) < 8 ? a.left - b.left : a.top - b.top; });

    /* The paper is the biggest image; everything else is the envelope art.
       (Not "anything screen-wide": on a phone Canva lets the envelope run
       past both edges of the screen.) */
    var art = [], background = null, biggest = null, most = 0;
    var imgs = section.getElementsByTagName("img");
    for (var b = 0; b < imgs.length; b++) {
      var br = imgs[b].getBoundingClientRect();
      if (br.width * br.height > most) { most = br.width * br.height; biggest = imgs[b]; }
    }
    if (biggest && biggest.getBoundingClientRect().width >= sr.width * 0.9) background = biggest.currentSrc || biggest.src;
    for (var m = 0; m < imgs.length; m++) {
      var src = imgs[m].currentSrc || imgs[m].src;
      var ir = imgs[m].getBoundingClientRect();
      if (!src || !ir.width || (background && imgs[m] === biggest)) continue;
      if (ir.width < 40 || ir.height < 40) continue;
      /* Canva crops a photo by clipping a larger image: keep the image and
         the visible part (x, y, w, h) apart. Only Canva's crop boxes count -
         boxes about the image's own size - not the screen-sized page, which
         would cut off an envelope that runs past the edges on a phone. */
      var vis = { left: ir.left, top: ir.top, right: ir.right, bottom: ir.bottom };
      for (var up = imgs[m].parentElement; up && up !== section; up = up.parentElement) {
        if (getComputedStyle(up).overflow === "visible") continue;
        var cr = up.getBoundingClientRect();
        if (cr.width > ir.width * 1.5 || cr.height > ir.height * 1.5) continue;
        vis = { left: Math.max(vis.left, cr.left), top: Math.max(vis.top, cr.top), right: Math.min(vis.right, cr.right), bottom: Math.min(vis.bottom, cr.bottom) };
      }
      if (vis.right - vis.left < 40 || vis.bottom - vis.top < 40) continue;
      art.push({
        src: src,
        x: vis.left, y: vis.top, w: vis.right - vis.left, h: vis.bottom - vis.top,
        ix: ir.left, iy: ir.top, iw: ir.width, ih: ir.height
      });
    }
    return { nav: nav, title: title, art: art, background: background };
  }

  /* ---------- building the page ---------- */

  function navNode(items) {
    var nav = el("nav", "sjr-nav");
    nav.setAttribute("aria-label", "Pages");
    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      var node = el(item.href ? "button" : "span");
      node.textContent = item.text;
      node.style.fontFamily = item.look.font + ", " + FALLBACK_FONT;
      if (item.href) { node.type = "button"; node.setAttribute("data-href", item.href); }
      if (!item.href || pathFor(item.href) === location.pathname) node.setAttribute("aria-current", "page");
      nav.appendChild(node);
    }
    return nav;
  }

  function artNode(pieces) {
    var box = el("div", "sjr-art");
    if (!pieces.length) return box;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < pieces.length; i++) {
      x0 = Math.min(x0, pieces[i].x); y0 = Math.min(y0, pieces[i].y);
      x1 = Math.max(x1, pieces[i].x + pieces[i].w); y1 = Math.max(y1, pieces[i].y + pieces[i].h);
    }
    var W = x1 - x0, H = y1 - y0;
    box.style.aspectRatio = W.toFixed(1) + " / " + H.toFixed(1);
    /* Never taller than ART_MAX (Canva's phone layout is a tall stem). */
    box.style.maxWidth = (ART_MAX * W / H).toFixed(2) + "em";
    for (var j = 0; j < pieces.length; j++) {
      var p = pieces[j];
      var clip = el("div", "sjr-clip");
      clip.style.left = ((p.x - x0) / W * 100).toFixed(3) + "%";
      clip.style.top = ((p.y - y0) / H * 100).toFixed(3) + "%";
      clip.style.width = (p.w / W * 100).toFixed(3) + "%";
      clip.style.height = (p.h / H * 100).toFixed(3) + "%";
      var img = el("img");
      img.alt = "";
      img.decoding = "async";
      img.onload = function () { this.classList.add("is-loaded"); };
      img.src = p.src;
      if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
      img.style.left = ((p.ix - p.x) / p.w * 100).toFixed(3) + "%";
      img.style.top = ((p.iy - p.y) / p.h * 100).toFixed(3) + "%";
      img.style.width = (p.iw / p.w * 100).toFixed(3) + "%";
      img.style.height = (p.ih / p.h * 100).toFixed(3) + "%";
      clip.appendChild(img);
      box.appendChild(clip);
    }
    return box;
  }

  function buildPage(c) {
    var s = el("section");
    s.id = "sj-rsvp-page";
    if (c.background) s.style.backgroundImage = 'url("' + c.background + '")';
    if (c.nav.length) { s.appendChild(navNode(c.nav)); s.classList.add("sjr-has-nav"); }
    var inner = el("div", "sjr-inner");

    /* The opening, centred: Canva's title, the envelope, then the reply-by
       date and the ask in a bubble beneath it. */
    var hero = el("div", "sjr-hero");
    var title = el("h1", "sjr-title");
    var words = c.title.length === 2 ? c.title : [
      { text: "Please", look: { font: FALLBACK_FONT, color: "#725885" } },
      { text: "RSVP", look: { font: FALLBACK_FONT, color: "#725885" } },
    ];
    var cls = ["sjr-please", "sjr-rsvp"];
    for (var w = 0; w < 2; w++) {
      var word = el("span", cls[w]);
      word.textContent = words[w].text;
      word.style.fontFamily = words[w].look.font + ", " + FALLBACK_FONT;
      word.style.color = words[w].look.color;
      title.appendChild(word);
    }
    hero.appendChild(title);
    var envelope = el("div", "sjr-envelope");
    envelope.appendChild(artNode(c.art));
    hero.appendChild(envelope);
    var badge = el("p", "sjr-badge", '<span class="sjr-badge-label">Kindly reply by</span><span class="sjr-date sjr-serif"></span>' +
      '<span class="sjr-badge-note">Please let us know if you&rsquo;ll be joining us on our special day.</span>');
    badge.querySelector(".sjr-date").textContent = REPLY_BY;
    hero.appendChild(badge);
    inner.appendChild(hero);

    /* Below: the little things to know beside the form. */
    var body = el("div", "sjr-body");
    var notes = el("aside", "sjr-notes");
    notes.setAttribute("aria-label", "Things to know");
    notes.appendChild(el("div", "sjr-notes-head",
      '<h2 class="sjr-notes-title sjr-heading">Things to know</h2>' +
      '<p class="sjr-notes-sub">A few little things before you reply</p>'));
    var list = el("ul");
    for (var i = 0; i < REMINDERS.length; i++) {
      list.appendChild(el("li", null,
        '<span class="sjr-icon">' + REMINDERS[i].icon + '</span>' +
        '<div><h3 class="sjr-serif">' + REMINDERS[i].title + '</h3><p>' + REMINDERS[i].text + '</p></div>'));
    }
    notes.appendChild(list);
    body.appendChild(notes);
    var form = buildForm(false);
    body.appendChild(form);
    wire(form);
    inner.appendChild(body);

    s.appendChild(inner);
    return s;
  }

  /* ---------- the form ---------- */

  function choice(value, title, sub) {
    return '<label class="sjr-choice" data-choice="' + value + '">' +
      '<input type="radio" name="attending" value="' + value + '">' +
      '<span class="sjr-mark"></span>' +
      '<span><span class="sjr-choice-title">' + title + '</span>' +
      '<span class="sjr-choice-sub">' + sub + '</span></span>' +
    '</label>';
  }

  function buildForm(overlay) {
    var wrap = el("div");
    wrap.id = "sj-rsvp";
    if (overlay) wrap.className = "sjr-overlay";
    wrap.innerHTML =
      '<div id="sj-rsvp-card">' +
        (overlay ? '<button class="sjr-close" type="button" aria-label="Close">&#10005;</button>' : "") +
        '<div class="sjr-form-head"><h2 class="sjr-form-title sjr-heading">Will you celebrate with us?</h2>' + BLOOM + '</div>' +
        '<form id="sj-rsvp-form" novalidate>' +
          '<div class="sjr-hp"><label>Do not fill this in <input name="bot-field" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="sjr-field">' +
            '<label class="sjr-label" for="sj-name">Full name<span class="sjr-req">*</span></label>' +
            '<input id="sj-name" name="name" type="text" autocomplete="name" placeholder="e.g. Juan Dela Cruz">' +
          '</div>' +
          '<div class="sjr-field">' +
            '<span class="sjr-label">Will you attend our wedding?<span class="sjr-req">*</span></span>' +
            '<div class="sjr-choices">' +
              choice("yes", "Wouldn\\u2019t miss it for the world!", "Can\\u2019t wait to celebrate with you") +
              choice("no", "Sorry, we can\\u2019t make it", "Sending love from afar") +
            '</div>' +
          '</div>' +
          '<div class="sjr-field">' +
            '<label class="sjr-label" for="sj-dietary">Dietary restrictions or allergies<span class="sjr-req">*</span></label>' +
            '<textarea id="sj-dietary" name="dietary" rows="3" placeholder="Please let us know, or write \\u201cnone\\u201d"></textarea>' +
          '</div>' +
          '<div class="sjr-field">' +
            '<label class="sjr-label" for="sj-message">Leave a message for the bride &amp; groom</label>' +
            '<textarea id="sj-message" name="message" rows="4" placeholder="Write your message here..."></textarea>' +
          '</div>' +
          '<button type="submit" class="sjr-submit sjr-serif">Send with love &#9825;' + SEND_ICON + '</button>' +
          '<p class="sjr-required-note">Fields marked with <span class="sjr-req">*</span> are required.</p>' +
          '<p class="sjr-note" id="sj-rsvp-note"></p>' +
        '</form>' +
      '</div>';
    return wrap;
  }

  function wire(root) {
    var form = root.querySelector("#sj-rsvp-form");
    var note = root.querySelector("#sj-rsvp-note");
    var button = root.querySelector(".sjr-submit");
    var label = button.innerHTML;

    function attending() {
      var picked = form.querySelector('input[name="attending"]:checked');
      return picked ? picked.value : "";
    }

    root.addEventListener("change", function (event) {
      if (event.target.name !== "attending") return;
      var choices = root.querySelectorAll(".sjr-choice");
      for (var i = 0; i < choices.length; i++) {
        choices[i].classList.toggle("sjr-choice--on", choices[i].querySelector("input").checked);
      }
    });

    function fail(message, focusId) {
      note.className = "sjr-note sjr-note--error";
      note.textContent = message;
      var field = focusId && root.querySelector(focusId);
      if (field) field.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      note.className = "sjr-note";
      note.textContent = "";

      var data = new FormData(form);
      var coming = attending() === "yes";

      if (!String(data.get("name") || "").trim()) return fail("Please tell us your full name.", "#sj-name");
      if (!attending()) return fail("Please let us know if you can make it.");
      // Only asked of a guest who is actually coming - catering questions make
      // no sense for someone who has declined.
      if (coming && !String(data.get("dietary") || "").trim()) {
        return fail("Please note any dietary needs, or write \\u201cnone\\u201d.", "#sj-dietary");
      }

      data.append("form-name", "rsvp");
      var body = new URLSearchParams();
      data.forEach(function (value, key) { body.append(key, value); });

      button.disabled = true;
      button.textContent = "Sending";

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          var card = root.querySelector("#sj-rsvp-card");
          card.innerHTML =
            '<div class="sjr-done">' + BLOOM +
              '<h2 class="sjr-heading">Thank you</h2>' +
              "<p>" + (coming
                ? "We cannot wait to celebrate with you."
                : "We will miss you, but thank you for letting us know.") +
              "</p>" +
            "</div>";
        })
        .catch(function (error) {
          console.warn("[rsvp] submission failed:", error);
          button.disabled = false;
          button.innerHTML = label;
          note.className = "sjr-note sjr-note--error";
          note.innerHTML =
            'Sorry, that did not send. Please try again, or RSVP ' +
            '<a href="https://shan-and-jake-wedding.my.canva.site/rsvp" target="_blank" rel="noopener">here</a>.';
        });
    });
  }

  /* ---------- the fallback ---------- */

  /* So there is ALWAYS a way to reply: Canva's renderer is slow and now and
     then paints nothing at all. */
  function addFallbackButton() {
    if (built || fallback) return;
    var open = el("button", null, "RSVP");
    open.id = "sj-rsvp-open";
    open.type = "button";
    open.addEventListener("click", function () {
      var panel = buildForm(true);
      document.body.appendChild(panel);
      wire(panel);
      function dismiss() { if (panel.parentNode) panel.parentNode.removeChild(panel); }
      panel.querySelector(".sjr-close").addEventListener("click", dismiss);
      document.addEventListener("keydown", function onKey(event) {
        if (event.key !== "Escape") return;
        document.removeEventListener("keydown", onKey);
        dismiss();
      });
    });
    fallback = open;
    document.body.appendChild(open);
  }

  /* ---------- mounting ---------- */

  /* 16px, divided by Canva's page scale, so text keeps its size wherever
     Canva shrinks the page. */
  function size() {
    if (!page || !page.parentElement) return;
    var parent = page.parentElement;
    if (!parent.offsetWidth) return;
    var k = parent.getBoundingClientRect().width / parent.offsetWidth || 1;
    var font = (16 / k).toFixed(3) + "px";
    if (page.style.fontSize !== font) page.style.fontSize = font;
  }

  function onScreen(node) {
    if (!node || !node.isConnected) return false;
    var r = node.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (var n = node; n && n !== document.documentElement; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false;
    }
    return true;
  }

  /* Leaving the page: nothing is restored while Canva fades it out. Ours goes
     when Canva removes that page (or hides it). */
  var leftBehind = [];
  function settleLeftBehind() {
    for (var i = leftBehind.length - 1; i >= 0; i--) {
      var l = leftBehind[i];
      var gone = !l.anchor.isConnected;
      if (!gone && onScreen(l.node)) continue;
      if (l.node.parentNode) l.node.parentNode.removeChild(l.node);
      if (!gone) { l.anchor.classList.remove("sjr-reading"); l.anchor.style.display = ""; }
      leftBehind.splice(i, 1);
    }
  }

  function sync() {
    if (!document.body) return;
    settleLeftBehind();
    var here = onRoute();
    document.documentElement.classList.toggle("sj-rsvp-route", here);
    if (!here) {
      if (page && canva && canva.isConnected) leftBehind.push({ node: page, anchor: canva });
      else if (page && page.parentNode) page.parentNode.removeChild(page);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      page = null; canva = null; since = 0; built = false; fallback = null; artCount = -1;
      return;
    }
    if (!since) since = Date.now();

    if (preview()) {
      if (!page) {
        page = buildPage({ nav: [], title: [], art: [], background: null });
        document.body.appendChild(page);
        built = true;
      }
      return;
    }

    var section = canvaSection();
    if (section && section !== canva) {
      /* A new Canva section (first visit, or Canva re-rendered it). */
      if (page && page.parentNode) page.parentNode.removeChild(page);
      page = null;
      built = false;
      artCount = -1;
      canva = section;
    }
    if (canva && !page) {
      canva.classList.add("sjr-reading");
      var got = readCanva(canva);
      /* Canva adds its images one by one after its text: take them once
         none has arrived for a moment - but not forever. */
      if (got) {
        var count = got.art.length;
        if (count !== artCount) { artCount = count; artSince = Date.now(); }
        if ((!count || Date.now() - artSince < 700) && Date.now() - since < READ_WAIT) { got = null; window.setTimeout(sync, 200); }
      }
      if (!got && Date.now() - since >= READ_WAIT) got = { nav: [], title: [], art: [], background: null };
      if (!got) return;
      page = buildPage(got);
      window.__sjHeroNav = got.nav.map(function (n) { return { text: n.text, href: n.href, font: n.look.font }; });
      canva.parentNode.insertBefore(page, canva);
      canva.classList.remove("sjr-reading");
      canva.style.display = "none";
      built = true;
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      fallback = null;
    }
    if (page && canva && page.nextElementSibling !== canva && canva.parentNode) canva.parentNode.insertBefore(page, canva);
    size();

    if (!built && Date.now() - since > FALLBACK_AFTER) addFallbackButton();
    if (fallback && fallback.parentNode !== document.body) document.body.appendChild(fallback);
  }

  /* Nav clicks: by position, not event.target (Canva swaps the element under
     the pointer between pointerdown and mouseup), through Canva's own router
     with a keyed entry, as its own links push them. */
  document.addEventListener("click", function (e) {
    if (!page || !page.isConnected) return;
    var over = e.detail !== 0 && document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest && over.closest("#sj-menu, #bgm-toggle")) return;
    var buttons = page.querySelectorAll(".sjr-nav button"), hit = null;
    for (var i = 0; i < buttons.length; i++) {
      var r = buttons[i].getBoundingClientRect();
      if (r.width && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) hit = buttons[i];
    }
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    var path = pathFor(hit.getAttribute("data-href"));
    if (path === null || path === location.pathname) return;
    var state = { key: Math.random().toString(36).slice(2, 8) };
    history.pushState(state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: state }));
  }, true);

  /* Set at once, before Canva draws anything, so its section never shows. */
  document.documentElement.classList.toggle("sj-rsvp-route", onRoute());

  var pending = false;
  function queue() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () { pending = false; sync(); });
  }
  if (window.MutationObserver) {
    new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
  }
  /* Canva routes with pushState, which fires no event, so a slow poll too. */
  window.addEventListener("popstate", sync);
  window.addEventListener("resize", size);
  window.setInterval(sync, 800);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderRsvp(
  nonce: string | null,
  pages: Record<string, string> = {},
  sections: Record<string, string[]> = {},
): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  const ids = Object.keys(sections)
    .filter((s) => s === "rsvp" || s.startsWith("rsvp-"))
    .map((s) => sections[s][0])
    .filter((id) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id));
  const heroSelector = ids.length
    ? ids.map((id) => `html.sj-rsvp-route #${id}`).join(", ")
    : "html.sj-rsvp-route .sj-never";
  return `\n<style${nonceAttr}>${styles(heroSelector)}</style>\n<script${nonceAttr}>${script(pages, sections)}</script>\n`;
}
