/**
 * Replaces Canva's form widget on the RSVP page with a form served from our own
 * origin.
 *
 * Canva's widget redirects to `https://www.canva.com/_website-element-widget`,
 * which answers with `x-frame-options: deny` and a `frame-ancestors` allowlist
 * naming `shan-and-jake-wedding.my.canva.site` and nothing else. Framed from any
 * other domain the browser refuses it outright ("www.canva.com refused to
 * connect"), so a proxied copy of the page can never show that widget.
 *
 * Submissions go to Netlify Forms. The field names here MUST match
 * public/_forms/rsvp.html, which is what registers the form at deploy time.
 *
 * Layout: a single-column card rendered in normal flow where the widget sat, so
 * it scrolls with the page rather than floating over the artwork. Because the
 * card is taller than the box Canva reserved, `ensureVisible` un-clips ancestors
 * and grows the page only as far as needed to reach the Submit button.
 *
 * This module is injected on EVERY page, not just /rsvp: Canva routes
 * client-side, so arriving at /rsvp from the invitation fires no document load.
 * The script scopes itself to the route at runtime instead.
 */

const ENDPOINT = "/_forms/rsvp.html";

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
const FONT = '"SJ The Seasons", Georgia, "Times New Roman", serif';

/** Lavender flower colours: buds darken toward the base of each spike. */
const LAVENDER = {
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

/**
 * Lavender spray for the card corners. Drawn rather than imported so it costs no
 * request; stems start at the bottom-left and the spikes reach top-right, so the
 * untransformed SVG fits a top-right corner. Clipped by the card.
 */
const SPRAY = `
<svg class="sj-spray" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <g fill="${LAVENDER.leaf}" opacity="0.85">
    <ellipse cx="30" cy="170" rx="15" ry="3.8" transform="rotate(-58 30 170)"/>
    <ellipse cx="48" cy="178" rx="14" ry="3.6" transform="rotate(-22 48 178)"/>
  </g>
  ${lavenderSprig({ x: 4, y: 196 }, { x: 44, y: 120 }, { x: 98, y: 22 }, 7, 6.2, 1.5)}
  ${lavenderSprig({ x: 4, y: 196 }, { x: 70, y: 140 }, { x: 150, y: 34 }, 8, 7, 1.6)}
  ${lavenderSprig({ x: 4, y: 196 }, { x: 92, y: 168 }, { x: 186, y: 86 }, 7, 6.2, 1.5)}
</svg>`;

/** Small bundle of three sprigs used above each heading. */
const BLOOM = `
<svg class="sj-bloom" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  ${lavenderSprig({ x: 16, y: 31 }, { x: 13, y: 20 }, { x: 8, y: 5 }, 5, 2.3, 0.9)}
  ${lavenderSprig({ x: 16, y: 31 }, { x: 16, y: 18 }, { x: 16, y: 2 }, 6, 2.5, 0.9)}
  ${lavenderSprig({ x: 16, y: 31 }, { x: 19, y: 20 }, { x: 24, y: 5 }, 5, 2.3, 0.9)}
</svg>`;

/** Line icons for the details card, on a 24x24 grid. */
const INFO_ICONS = {
  date: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  location:
    '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  attire:
    '<path d="M10 5.2a2 2 0 1 1 2 2v1.3"/><path d="M12 8.5 3.7 15.1a1.3 1.3 0 0 0 .8 2.4h15a1.3 1.3 0 0 0 .8-2.4z"/>',
};

/**
 * The details card beside the form. Wording is copied from the Canva "Details"
 * page (checked 2026-09-13); if the couple edits that page, update this too.
 */
const INFO_TITLE = "Wedding Details";
const INFO_ITEMS: Array<{ icon: keyof typeof INFO_ICONS; label: string; main: string; sub: string[] }> = [
  {
    icon: "date",
    label: "Date",
    main: "Sunday, 7 February 2027",
    sub: ["Ceremony &middot; 3:00 &ndash; 4:00 PM", "Reception &middot; 6:00 &ndash; 10:00 PM"],
  },
  {
    icon: "location",
    label: "Location",
    main: "Nuuk Taal",
    sub: ["295 Talisay-Laurel Road, Kilometer 89, Barangay Berinayan, Laurel, Batangas, Philippines"],
  },
  {
    icon: "attire",
    label: "Attire",
    main: "Formal attire in pastel tones",
    sub: ["Soft, pastel colors that complement the romantic garden setting."],
  },
];

const INFO = `
<div class="sj-card-inner">
  <div class="sj-head">${BLOOM}
    <span class="sj-head-text">${INFO_TITLE}</span>
    <span class="sj-head-rule"></span>
  </div>
  <div class="sj-info-logo-wrap"><span class="sj-info-logo" aria-hidden="true"></span></div>
  <div class="sj-info-list">${INFO_ITEMS.map(
    (item) => `
    <div class="sj-info-item">
      <span class="sj-label sj-info-label"><svg class="sj-info-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${INFO_ICONS[item.icon]}</svg>${item.label}</span>
      <span class="sj-info-main">${item.main}</span>
      ${item.sub.map((line) => `<span class="sj-info-sub">${line}</span>`).join("")}
    </div>`,
  ).join("")}
  </div>
</div>`;

const STYLES = `${FONT_FACES}
  #sj-rsvp {
    /* Lavender-pink palette. The -rgb triplets feed the translucent rgba()
       tints below, so a re-theme only touches this block. The accent keeps
       ~4.5:1 contrast on the card, like the sakura rose it replaced
       (#c4566b; retheme requested 2026-09-13). */
    --sj-ink: #655a66;
    /* Dark enough to stay legible at the small, tracked-out label size. */
    --sj-muted: #8a7889;
    --sj-text-soft: #6a5f6b;
    --sj-accent: #9e6297;
    --sj-accent-rgb: 158, 98, 151;
    --sj-accent-soft: #cfa3c8;
    --sj-accent-soft-rgb: 207, 163, 200;
    --sj-tint: #f8f0f7;
    --sj-line: #ecdcea;
    --sj-paper: #fefcff;
    --sj-shadow-rgb: 140, 100, 138;

    /* In normal flow, where Canva's widget sat. Deliberately NOT fixed: a fixed
       panel floats over the artwork and follows the scroll. */
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    font-family: ${FONT};
    color: var(--sj-ink);
    -webkit-font-smoothing: antialiased;
  }
  #sj-rsvp * { box-sizing: border-box; }

  /* The fallback modal is the one case that should overlay the page. */
  #sj-rsvp.sj-rsvp--overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483100;
    align-items: center;
    padding: clamp(0.75rem, 2vh, 1.5rem);
    background: rgba(66, 52, 68, 0.45);
    overflow-y: auto;
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }

  /* The form card and the details card share one look. */
  #sj-rsvp-card, #sj-rsvp-info {
    display: flex;
    flex-direction: column;
    /* Clips the corner sprays. */
    overflow: hidden;
    background: rgba(254, 252, 255, 0.97);
    border: 1px solid rgba(var(--sj-accent-rgb), 0.12);
    border-radius: 22px;
    box-shadow:
      0 1px 2px rgba(var(--sj-shadow-rgb), 0.05),
      0 22px 56px rgba(var(--sj-shadow-rgb), 0.17);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
  }
  #sj-rsvp-card {
    position: relative;
    width: 100%;
    max-width: 620px;
  }

  /* Beside the form, same top and at least the same height. placeInfo sets
     left and width, or hides it when there is no room to the right. */
  #sj-rsvp-info {
    position: absolute;
    top: 0;
    min-height: 100%;
  }
  #sj-rsvp-info[hidden] { display: none; }
  #sj-rsvp-info .sj-card-inner { flex: 1; display: flex; flex-direction: column; }

  /* Centred, echoing the heading; items split by a short rule like the one
     under the heading. Text is larger than the form's, at the couple's request. */
  /* The logo takes all spare height and sits in the middle of it, so it is
     centred between the heading and the details, which end at the bottom like
     the form's content does. */
  /* Two ids: must outrank the shared .sj-head rule further down. */
  #sj-rsvp #sj-rsvp-info .sj-head { margin-bottom: 0; }
  #sj-rsvp .sj-info-logo-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1.2rem, 2.6vh, 1.8rem) 0;
  }
  #sj-rsvp .sj-info-list {
    display: flex;
    flex-direction: column;
    gap: clamp(1rem, 2.2vh, 1.5rem);
    /* Matches the empty .sj-note under the form, so both cards end level. */
    margin-bottom: 0.9rem;
  }
  #sj-rsvp .sj-info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  /* The couple's monogram. The PNG is used only as a mask, so its colour is
     set here to match the heading. public/_wedding is cached immutably, so a
     new logo needs a new filename. */
  #sj-rsvp .sj-info-logo {
    flex: none;
    width: 98px;
    height: 120px;
    /* A shade lighter than the heading, so it reads as an ornament. */
    background-color: rgba(var(--sj-accent-rgb), 0.75);
    -webkit-mask: url("/_wedding/logo-mark.png") center / contain no-repeat;
    mask: url("/_wedding/logo-mark.png") center / contain no-repeat;
  }
  #sj-rsvp .sj-info-item + .sj-info-item::before {
    content: "";
    width: 44px;
    height: 1px;
    margin-bottom: clamp(1rem, 2.2vh, 1.5rem);
    background: var(--sj-accent-soft);
    opacity: 0.55;
  }
  /* Two classes: must outrank the generic .sj-label rule further down. */
  #sj-rsvp .sj-label.sj-info-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 0.45rem;
    font-size: 1.1rem;
  }
  #sj-rsvp .sj-info-icon {
    flex: none;
    width: 1.4em;
    height: 1.4em;
    fill: none;
    stroke: var(--sj-accent);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  #sj-rsvp .sj-info-main {
    display: block;
    font-size: 1.7rem;
    line-height: 1.3;
    color: var(--sj-text-soft);
  }
  #sj-rsvp .sj-info-sub {
    display: block;
    margin-top: 0.3rem;
    font-size: 1.25rem;
    line-height: 1.5;
    color: var(--sj-muted);
  }

  /* Soft wash behind the heading. */
  #sj-rsvp-info::before,
  #sj-rsvp-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 150px;
    background: linear-gradient(180deg, rgba(var(--sj-accent-soft-rgb), 0.2) 0%, rgba(var(--sj-accent-soft-rgb), 0) 100%);
    pointer-events: none;
  }
  #sj-rsvp.sj-rsvp--overlay #sj-rsvp-card { max-height: 94vh; }

  #sj-rsvp .sj-card-inner {
    position: relative;
    z-index: 1;
    padding: clamp(1.2rem, 3vw, 1.9rem) clamp(1.2rem, 3.2vw, 2rem);
  }
  #sj-rsvp.sj-rsvp--overlay .sj-card-inner { overflow-y: auto; }

  /* Decoration only - must never intercept a tap meant for a field. */
  #sj-rsvp .sj-spray {
    position: absolute;
    z-index: 0;
    width: clamp(78px, 9vw, 112px);
    height: auto;
    opacity: 0.4;
    pointer-events: none;
    user-select: none;
  }
  /* Submit is full-width now, so keep the lower accent very faint. */
  #sj-rsvp .sj-spray--bl,
  #sj-rsvp .sj-spray--br { opacity: 0.26; }
  /* Flush to the corner with no outward offset. Anything sticking out - negative
     insets OR a translate - counts as scrollable overflow, and the card could
     then be nudged when a field takes focus.

     Top-right and bottom-left are the two genuinely empty corners: the heading
     occupies top-left and the Submit button sits bottom-right. The artwork's
     lavender spikes already reach its own top-right from stems at bottom-left,
     so the untransformed SVG lands correctly in the top-right corner. */
  #sj-rsvp .sj-spray--tr { top: 0; right: 0; }
  #sj-rsvp .sj-spray--bl { bottom: 0; left: 0; transform: rotate(180deg); }
  /* The details card mirrors the form's pair, so the two cards frame each
     other across the gap. Flips happen in place, so nothing sticks out. */
  #sj-rsvp .sj-spray--tl { top: 0; left: 0; transform: scaleX(-1); }
  #sj-rsvp .sj-spray--br { bottom: 0; right: 0; transform: scaleY(-1); }
  @media (max-width: 560px) {
    #sj-rsvp .sj-spray { opacity: 0.3; width: 84px; }
  }

  #sj-rsvp .sj-head {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: clamp(1.3rem, 2.8vh, 1.9rem);
    text-align: center;
  }
  #sj-rsvp .sj-bloom { width: 40px; height: 40px; flex: none; }
  #sj-rsvp .sj-head-text {
    font-family: ${FONT};
    font-size: clamp(1.65rem, 3.6vw, 2.1rem);
    line-height: 1.25;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    /* The Seasons runs wide; without this a wrap strands "US?" on its own line. */
    text-wrap: balance;
    color: var(--sj-accent);
  }
  #sj-rsvp .sj-head-rule {
    width: 64px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, rgba(var(--sj-accent-soft-rgb), 0) 0%, var(--sj-accent-soft) 50%, rgba(var(--sj-accent-soft-rgb), 0) 100%);
  }

  /* Single column, always. */
  #sj-rsvp .sj-grid { position: relative; }

  #sj-rsvp .sj-field { margin-bottom: clamp(0.85rem, 1.9vh, 1.2rem); }
  /* Only the final field in the form, not the last one in each stacked group. */
  #sj-rsvp .sj-col:last-child .sj-field:last-child { margin-bottom: 0; }

  #sj-rsvp .sj-label {
    display: block;
    margin-bottom: 0.55rem;
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1.5;
    color: var(--sj-muted);
  }
  #sj-rsvp .sj-req { color: var(--sj-accent); margin-left: 0.15em; }

  /* Soft filled fields - a modern control surface rather than ruled lines. */
  #sj-rsvp input[type="text"],
  #sj-rsvp textarea {
    width: 100%;
    padding: 1rem 1.15rem;
    font-family: ${FONT};
    /* px, not rem: Canva's root is 10px. 16px is also the minimum that stops
       iOS Safari zooming the page when a field takes focus. */
    font-size: 16px;
    line-height: 1.55;
    color: var(--sj-ink);
    background: var(--sj-tint);
    border: 1px solid transparent;
    border-radius: 13px;
    transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }
  #sj-rsvp textarea { resize: none; }
  #sj-rsvp input::placeholder, #sj-rsvp textarea::placeholder {
    color: #c3b3c2;
  }
  #sj-rsvp input:focus, #sj-rsvp textarea:focus {
    outline: none;
    background: #fffdfe;
    border-color: var(--sj-accent-soft);
    box-shadow: 0 0 0 4px rgba(var(--sj-accent-soft-rgb), 0.18);
  }

  #sj-rsvp .sj-choices { display: flex; flex-direction: column; gap: 0.5rem; }
  #sj-rsvp .sj-choice {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.95rem 1rem;
    background: var(--sj-tint);
    border: 1px solid transparent;
    border-radius: 14px;
    cursor: pointer;
    transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
  }
  #sj-rsvp .sj-choice:hover {
    border-color: rgba(var(--sj-accent-soft-rgb), 0.6);
    transform: translateY(-1px);
  }
  #sj-rsvp .sj-choice input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  /* Circular tick that fills on select. */
  #sj-rsvp .sj-mark {
    flex: none;
    width: 25px;
    height: 25px;
    position: relative;
    border: 1.5px solid rgba(var(--sj-accent-soft-rgb), 0.8);
    border-radius: 50%;
    background: #fffdfe;
    transition: border-color 180ms ease, background-color 180ms ease;
  }
  #sj-rsvp .sj-mark::after {
    content: "";
    position: absolute;
    left: 8px;
    top: 4.2px;
    width: 6px;
    height: 11px;
    border: solid #fffdfe;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0.4);
    opacity: 0;
    transition: opacity 160ms ease, transform 160ms ease;
  }
  #sj-rsvp .sj-choice-text {
    font-family: ${FONT};
    font-size: 1.26rem;
    line-height: 1.35;
    color: var(--sj-text-soft);
  }
  #sj-rsvp .sj-choice--on {
    border-color: var(--sj-accent);
    background: linear-gradient(180deg, rgba(var(--sj-accent-rgb), 0.10) 0%, rgba(var(--sj-accent-rgb), 0.05) 100%);
  }
  #sj-rsvp .sj-choice--on .sj-mark {
    border-color: var(--sj-accent);
    background: var(--sj-accent);
  }
  #sj-rsvp .sj-choice--on .sj-mark::after { opacity: 1; transform: rotate(45deg) scale(1); }

  #sj-rsvp .sj-foot { margin-top: clamp(1.2rem, 2.4vh, 1.7rem); }

  #sj-rsvp .sj-required-note {
    display: block;
    margin-top: 0.85rem;
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    text-align: center;
    color: #a597a6;
  }

  #sj-rsvp .sj-submit {
    width: 100%;
    padding: 1.15rem 1.5rem;
    font-family: ${FONT};
    font-size: 0.88rem;
    font-weight: 500;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: #fffdfc;
    background: linear-gradient(135deg, #d4acd0 0%, var(--sj-accent) 100%);
    border: none;
    border-radius: 14px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(var(--sj-accent-rgb), 0.3);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }
  #sj-rsvp .sj-submit:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: 0 10px 26px rgba(var(--sj-accent-rgb), 0.34);
  }
  #sj-rsvp .sj-submit:active { transform: translateY(0); }
  #sj-rsvp .sj-submit[disabled] { opacity: 0.55; cursor: default; }

  #sj-rsvp .sj-note { margin: 0.9rem 0 0; font-size: 0.92rem; line-height: 1.5; text-align: center; }
  #sj-rsvp .sj-note--error { color: #a83a52; }
  #sj-rsvp .sj-note a { color: var(--sj-accent); }

  #sj-rsvp-done { text-align: center; padding: clamp(2rem, 6vh, 3.6rem) 1rem; }
  #sj-rsvp-done .sj-bloom { width: 52px; height: 52px; margin: 0 auto 1.1rem; display: block; }
  #sj-rsvp-done h2 {
    margin: 0 0 0.85rem;
    font-family: ${FONT};
    font-size: clamp(2.1rem, 5.2vw, 2.8rem);
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--sj-accent);
  }
  #sj-rsvp-done p { margin: 0; font-size: 1.1rem; line-height: 1.7; color: #807481; }

  #sj-rsvp .sj-hp { position: absolute; left: -9999px; opacity: 0; }

  /* Fallback path: used only if Canva's widget never renders, so that there is
     always a way to RSVP. */
  #sj-rsvp-open {
    position: fixed;
    left: 50%;
    bottom: max(1rem, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 2147482000;
    padding: 0.85rem 2.4rem;
    font-family: ${FONT};
    font-size: 0.68rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #fffdf8;
    /* Outside #sj-rsvp, so the palette variables do not reach it. */
    background: #9e6297;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(66, 52, 68, 0.3);
  }

  #sj-rsvp-close {
    position: absolute;
    top: 0.35rem;
    right: 0.55rem;
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
    line-height: 1;
    color: #9a8e9a;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  #sj-rsvp-close:hover { color: var(--sj-accent); }
`;

const SCRIPT = `
(function () {
  var ENDPOINT = ${JSON.stringify(ENDPOINT)};
  var WIDGET_MATCH = "_website-element-widget";
  var mounted = false;
  var fallback = null;
  var formNode = null;
  var onRsvpSince = 0;

  // Inlined at build time from the module constants.
  var SPRAY = ${JSON.stringify(SPRAY)};
  var BLOOM = ${JSON.stringify(BLOOM)};
  var INFO = ${JSON.stringify(INFO)};

  // Details card placement, in px.
  var INFO_GAP = 24;
  var INFO_EDGE = 16;
  var INFO_MIN_WIDTH = 280;

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (html != null) node.innerHTML = html;
    return node;
  }

  function choice(value, text) {
    return '<label class="sj-choice" data-choice="' + value + '">' +
      '<input type="radio" name="attending" value="' + value + '">' +
      '<span class="sj-mark"></span>' +
      '<span class="sj-choice-text">' + text + '</span>' +
    '</label>';
  }

  function buildForm(withClose) {
    var wrap = el("div", { id: "sj-rsvp" });
    if (withClose) wrap.className = "sj-rsvp--overlay";
    wrap.innerHTML =
      '<div id="sj-rsvp-card">' +
        SPRAY.replace("sj-spray", "sj-spray sj-spray--tr") +
        SPRAY.replace("sj-spray", "sj-spray sj-spray--bl") +
        (withClose
          ? '<button id="sj-rsvp-close" type="button" aria-label="Close">&#10005;</button>'
          : "") +
        '<div class="sj-card-inner">' +
        '<div class="sj-head">' + BLOOM +
          '<span class="sj-head-text">Will you celebrate with us?</span>' +
          '<span class="sj-head-rule"></span>' +
        '</div>' +
        '<form id="sj-rsvp-form" novalidate>' +
          '<div class="sj-hp"><label>Do not fill this in ' +
            '<input name="bot-field" tabindex="-1" autocomplete="off"></label></div>' +

          '<div class="sj-grid">' +
            '<div class="sj-col">' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-name">Full name<span class="sj-req">*</span></label>' +
                '<input id="sj-name" name="name" type="text" autocomplete="name">' +
              '</div>' +
              '<div class="sj-field">' +
                '<span class="sj-label">Will you attend our wedding?<span class="sj-req">*</span></span>' +
                '<div class="sj-choices">' +
                  choice("yes", "Wouldn&rsquo;t miss it for the world!") +
                  choice("no", "Sending love from afar.") +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="sj-col">' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-dietary">Dietary restrictions or allergies' +
                  '<span class="sj-req">*</span></label>' +
                '<textarea id="sj-dietary" name="dietary" rows="2"></textarea>' +
              '</div>' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-message">Leave a message for the bride &amp; groom</label>' +
                '<textarea id="sj-message" name="message" rows="3"></textarea>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="sj-foot">' +
            '<button type="submit" class="sj-submit">Submit</button>' +
            '<span class="sj-required-note">' +
              'Fields marked <span class="sj-req">*</span> are required' +
            '</span>' +
          '</div>' +
          '<p class="sj-note" id="sj-rsvp-note"></p>' +
        '</form>' +
        '</div>' +
      '</div>';
    // Inline page only; the fallback modal has no room beside it.
    if (!withClose) {
      var info = el("aside", { id: "sj-rsvp-info", "aria-label": "Wedding details" },
        SPRAY.replace("sj-spray", "sj-spray sj-spray--tl") +
        SPRAY.replace("sj-spray", "sj-spray sj-spray--br") +
        INFO);
      info.hidden = true;
      wrap.appendChild(info);
    }
    return wrap;
  }

  function wire(root) {
    var form = root.querySelector("#sj-rsvp-form");
    var note = root.querySelector("#sj-rsvp-note");
    var button = root.querySelector(".sj-submit");

    function attending() {
      var picked = form.querySelector('input[name="attending"]:checked');
      return picked ? picked.value : "";
    }

    root.addEventListener("change", function (event) {
      if (event.target.name !== "attending") return;
      var choices = root.querySelectorAll(".sj-choice");
      for (var i = 0; i < choices.length; i++) {
        choices[i].classList.toggle("sj-choice--on", choices[i].querySelector("input").checked);
      }
    });

    function fail(message, focusId) {
      note.className = "sj-note sj-note--error";
      note.textContent = message;
      var field = focusId && root.querySelector(focusId);
      if (field) field.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      note.className = "sj-note";
      note.textContent = "";

      var data = new FormData(form);
      var coming = attending() === "yes";

      if (!String(data.get("name") || "").trim()) {
        return fail("Please tell us your full name.", "#sj-name");
      }
      if (!attending()) {
        return fail("Please let us know if you can make it.");
      }
      // Only enforced for a guest who is actually coming - asking someone who
      // has declined about catering makes no sense.
      if (coming && !String(data.get("dietary") || "").trim()) {
        return fail(
          "Please note any dietary needs, or write \\u201cnone\\u201d.",
          "#sj-dietary"
        );
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
            SPRAY.replace("sj-spray", "sj-spray sj-spray--tr") +
            SPRAY.replace("sj-spray", "sj-spray sj-spray--bl") +
            '<div class="sj-card-inner"><div id="sj-rsvp-done">' +
              BLOOM +
              "<h2>Thank you</h2>" +
              "<p>" + (coming
                ? "We cannot wait to celebrate with you."
                : "We will miss you, but thank you for letting us know.") +
              "</p>" +
            "</div></div>";
        })
        .catch(function (error) {
          console.warn("[rsvp] submission failed:", error);
          button.disabled = false;
          button.textContent = "Submit";
          note.className = "sj-note sj-note--error";
          note.innerHTML =
            'Sorry, that did not send. Please try again, or RSVP ' +
            '<a href="https://shan-and-jake-wedding.my.canva.site/rsvp" target="_blank" ' +
            'rel="noopener">here</a>.';
        });
    });
  }

  /**
   * The vertical form is taller than the box Canva reserved for the widget
   * (~565px). Left alone the bottom of the card - including the Submit
   * button - could be clipped.
   *
   * So: un-clip any ancestor that would cut it off. The overflow then extends
   * the scroll range of Canva's own page scroller, which reaches the card.
   *
   * Canva scrolls the page inside a container, not the document, so the
   * document is always one viewport tall. Growing <body> to fit the card
   * therefore made the document scroll too, putting a second scrollbar beside
   * Canva's. Only grow the page if no ancestor scrolls at all.
   */
  function ensureVisible(form) {
    var card = form.querySelector("#sj-rsvp-card");
    if (!card) return;

    var node = form.parentElement;
    for (var i = 0; i < 6 && node && node !== document.body; i++) {
      var cs = window.getComputedStyle(node);
      // Never un-clip Canva's page scroller; that would stop the page scrolling.
      if (cs.overflowY === "auto" || cs.overflowY === "scroll") break;
      if (cs.overflow !== "visible") node.style.overflow = "visible";
      node = node.parentElement;
    }

    if (scrollingAncestor(form)) return;

    var needed = Math.ceil(
      card.getBoundingClientRect().bottom + (window.pageYOffset || 0) + 48
    );
    if (needed > document.documentElement.scrollHeight) {
      document.body.style.minHeight = needed + "px";
      if (window.getComputedStyle(document.documentElement).overflowY === "hidden") {
        document.documentElement.style.overflowY = "auto";
      }
      if (window.getComputedStyle(document.body).overflowY === "hidden") {
        document.body.style.overflowY = "visible";
      }
    }
  }

  function scrollingAncestor(el) {
    for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      var overflowY = window.getComputedStyle(n).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return n;
    }
    return null;
  }

  /**
   * Shows the details card to the right of the form and centres the pair on
   * the page when both fit; otherwise hides the card and leaves the form where
   * Canva put it. It is never stacked below: Canva fixes the page height and
   * clips it, so anything below the form is cut off (measured on a phone,
   * 2026-09-13). Guests on narrow screens still have the Details page.
   */
  function placeInfo() {
    if (!formIsLive() || formNode.classList.contains("sj-rsvp--overlay")) return;
    var info = formNode.querySelector("#sj-rsvp-info");
    var card = formNode.querySelector("#sj-rsvp-card");
    if (!info || !card) return;

    // Measure from Canva's own position, not from our previous shift.
    formNode.style.left = "";

    var scroller = scrollingAncestor(formNode);
    var viewLeft = scroller ? scroller.getBoundingClientRect().left : 0;
    var viewWidth = scroller ? scroller.clientWidth : document.documentElement.clientWidth;
    var cardRect = card.getBoundingClientRect();
    var width = Math.floor(Math.min(
      cardRect.width,
      viewWidth - 2 * INFO_EDGE - cardRect.width - INFO_GAP
    ));

    if (width < INFO_MIN_WIDTH) {
      info.hidden = true;
      return;
    }
    var pairLeft = viewLeft + (viewWidth - (cardRect.width + INFO_GAP + width)) / 2;
    formNode.style.left = Math.round(pairLeft - cardRect.left) + "px";
    info.style.left = card.offsetLeft + card.offsetWidth + INFO_GAP + "px";
    info.style.width = width + "px";
    info.hidden = false;
  }

  /** Mounted in place of the widget so it sits in the page and scrolls with it. */
  function swap(frame) {
    var parent = frame.parentNode;
    if (!parent) return;

    var form = buildForm(false);
    parent.replaceChild(form, frame);
    wire(form);
    formNode = form;
    mounted = true;
    ensureVisible(form);
    placeInfo();
    // Canva may still be settling its layout, and the webfont changes heights.
    window.setTimeout(placeInfo, 1000);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInfo);
    watchLayout(form);
  }

  /**
   * Canva repositions the form AFTER the resize event, so placing the details
   * card only on resize measured the old position and hid it. Re-place once
   * things settle, and whenever Canva changes the box the form sits in.
   */
  var placeTimers = [];
  var layoutObserver = null;
  function schedulePlaceInfo() {
    while (placeTimers.length) window.clearTimeout(placeTimers.pop());
    // Canva may only MOVE the form (no resize to observe), so check twice.
    placeTimers.push(window.setTimeout(placeInfo, 200), window.setTimeout(placeInfo, 1000));
  }
  function watchLayout(form) {
    if (!window.ResizeObserver) return;
    if (layoutObserver) layoutObserver.disconnect();
    layoutObserver = new ResizeObserver(schedulePlaceInfo);
    if (form.parentElement) layoutObserver.observe(form.parentElement);
    layoutObserver.observe(form);
  }

  window.addEventListener("resize", function () {
    if (formIsLive() && !formNode.classList.contains("sj-rsvp--overlay")) {
      ensureVisible(formNode);
      placeInfo();
      schedulePlaceInfo();
    }
  });

  function formIsLive() {
    return Boolean(formNode && document.documentElement.contains(formNode));
  }

  function findWidget() {
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      var src = frames[i].getAttribute("src") || frames[i].src || "";
      if (src.indexOf(WIDGET_MATCH) !== -1) return frames[i];
    }
    return null;
  }

  /**
   * Fallback so there is ALWAYS a way to RSVP.
   *
   * Canva's renderer is slow and occasionally paints nothing at all, and the
   * widget URL is theirs to change. If the in-place swap has not happened,
   * offer the same form rather than leaving a guest with no option.
   */
  function addFallbackButton() {
    if (mounted || fallback) return;

    var open = el("button", { id: "sj-rsvp-open", type: "button" }, "RSVP");
    open.addEventListener("click", function () {
      var panel = buildForm(true);
      document.body.appendChild(panel);
      wire(panel);

      function dismiss() {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }
      panel.querySelector("#sj-rsvp-close").addEventListener("click", dismiss);
      document.addEventListener("keydown", function onKey(event) {
        if (event.key !== "Escape") return;
        document.removeEventListener("keydown", onKey);
        dismiss();
      });
    });

    fallback = open;
    document.body.appendChild(open);
  }

  /**
   * Canva re-renders the page body repeatedly, detaching anything we inserted.
   * So this never stops watching and never assumes a previous mount survived:
   * it re-swaps a lost form and re-attaches a lost fallback button.
   */
  function tick() {
    // Canva navigates between pages client-side, so the form must take itself
    // down if we are no longer on /rsvp - it belongs to that page alone.
    if (!/^\\/(rsvp\\/?|_preview-rsvp)$/i.test(location.pathname)) {
      if (formNode && formNode.parentNode) formNode.parentNode.removeChild(formNode);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      formNode = null;
      fallback = null;
      mounted = false;
      onRsvpSince = 0;
      return;
    }

    if (formIsLive()) return;

    // Measured from arrival on the route, not from page load: a guest can reach
    // /rsvp minutes later via client-side navigation.
    if (!onRsvpSince) onRsvpSince = Date.now();

    var frame = findWidget();
    if (frame) {
      swap(frame);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      fallback = null;
      return;
    }

    // Canva's widget has not appeared. Give it a grace period, then guarantee
    // a way to RSVP regardless.
    if (Date.now() - onRsvpSince > 12000) addFallbackButton();

    // Re-appending the same node preserves its listener.
    if (fallback && fallback.parentNode !== document.body && document.body) {
      document.body.appendChild(fallback);
    }
  }

  tick();

  if (window.MutationObserver) {
    var pending = null;
    var observer = new MutationObserver(function () {
      // Canva mutates the DOM constantly; coalesce bursts into one check.
      if (pending) return;
      pending = window.setTimeout(function () {
        pending = null;
        tick();
      }, 150);
    });
    // No timeout: a slow phone or a slow network must not lose the form.
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  /**
   * Canva routes between pages client-side. The observer catches most of it,
   * but a history change plus a low-frequency poll makes arriving at /rsvp from
   * the invitation reliable - that path fires no document load, and missing it
   * leaves Canva's broken widget on screen.
   */
  window.addEventListener("popstate", tick);
  window.addEventListener("hashchange", tick);
  window.setInterval(tick, 1500);

  tick();
})();
`;

export function renderRsvp(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
