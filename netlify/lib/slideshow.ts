/**
 * Turns the first screen of the main invitation page into a full-screen photo
 * slideshow: the couple's photos crossfading behind their names, the date and
 * the venue, with previous/next arrows, dots, swipe, and a "scroll down" cue.
 *
 * The approach, chosen after stretching Canva's own hero section proved
 * fragile (hero.ts, reverted 2026-10-04): leave Canva's layout alone and put a
 * section of our own in front of it.
 *
 *   section parent         <- stacks the page's sections in normal flow
 *     section#sj-hero      <- ours, inserted first, one screen tall
 *     section (hidden)     <- Canva's hero: display:none, so the rest moves up
 *     section, section...  <- the rest of the page, untouched
 *
 * Nothing is hard-coded that the couple might change in Canva:
 *  - the photos are the Gallery page's photo grid, read from Canva's page data
 *    on every request (media hashes change each time they re-publish);
 *  - the names, date, venue and nav labels, and their fonts, are read from
 *    Canva's hero at runtime, just before it is hidden.
 * If either cannot be found, the slideshow does not mount and Canva's own hero
 * stays - the page is never left without a first screen.
 *
 * Nav items change page through Canva's own client-side router, so the music
 * keeps playing. On phones the nav is a dropdown behind a menu button.
 */
import { MOBILE } from "./player.ts";
import { FONT } from "./rsvp.ts";

/** The main page's slug, as a prefix: it survives a `/main-2` style rename. */
const ROUTE_PREFIX = "/main";
const GALLERY_PREFIX = "gallery";

type Slide = { src: string; w: number; h: number };

/**
 * The Gallery page's grid photos, in grid order.
 *
 * In Canva's page data (measured 2026-10-04):
 *
 *   page index   {"K":"PBTpbt...","L":"gallery", ...}
 *   page content "a":"PBTpbt..." ... the grid's cells, keyed a, b, c...:
 *                "a":{"A":{"B":{"A":{"A?":"d","A":"MAHT3K-_E9k","B":1}, ...
 *                (an "I" after the "A" is the edited copy Canva displays)
 *   media table  one entry per size (800px, 2x, 3x), each listing one file:
 *                {"type":"RASTER","id":"MAHT3K-_E9k","version":1,"files":[
 *                  {"url":"_assets/media/<hash>.png","urlDenied":false,"width":437,"height":800, ...
 *
 * The largest file is used: Canva keeps these at ~1450px at most, which is
 * already the floor for a full-screen photo.
 */
/**
 * Canva's nav link numbers to page slugs: `#page-5` -> "gallery". Read per
 * request, like the photos, so a renamed page (`/main` -> `/main-2`) is
 * followed.
 *
 * The number is each page's own `"P"` field, NOT its place in the page list:
 * an unlinked extra page (`/our-story-2`, added 2026-10-04) sits in the list
 * without one, and counting positions sent GALLERY to /rsvp.
 *
 *   page index    {"K":"PBTpbt...","L":"gallery", ...}
 *   page content  "a":"PBTpbt...","B":"GALLERY","R":false,...,"P":"5"
 *
 * Falls back to list positions if no page has a number at all.
 */
export function findPages(html: string): Record<string, string> {
  const pages = [...html.matchAll(/"K":"([A-Za-z0-9_-]+)","L":"([a-z0-9-]*)"/g)];
  const numbered: Record<string, string> = {};
  for (const [, key, slug] of pages) {
    const p = new RegExp(
      `"a":"${key}","B":"[^"]*"(?:,"[A-Za-z]":(?:false|true|-?[\\d.]+|"[^"]*"|\\{\\}))*,"P":"(\\d+)"`,
    ).exec(html);
    if (p) numbered[p[1]] = slug;
  }
  if (Object.keys(numbered).length) return numbered;
  return Object.fromEntries(pages.map((m, i) => [String(i), m[2]]));
}

export function findSlides(html: string): Slide[] {
  try {
    const pages = [...html.matchAll(/"K":"([A-Za-z0-9_-]+)","L":"([a-z0-9-]*)"/g)]
      .map((m) => ({ slug: m[2], at: html.indexOf(`"a":"${m[1]}"`) }))
      .filter((p) => p.at !== -1)
      .sort((a, b) => a.at - b.at);
    const i = pages.findIndex((p) => p.slug.startsWith(GALLERY_PREFIX));
    if (i === -1) return [];
    const block = html.slice(pages[i].at, pages[i + 1]?.at ?? html.length);

    const cell =
      /"[a-z]":\{"A":\{"B":\{"A":\{"A\?":"d","A":"([A-Za-z0-9_-]+)","B":\d+\}(?:,"I":\{"A\?":"d","A":"([A-Za-z0-9_-]+)")?/g;
    const ids = [...new Set([...block.matchAll(cell)].map((m) => m[2] ?? m[1]))];

    const slides: Slide[] = [];
    for (const id of ids) {
      // One media entry per size (SCREEN, SCREEN_2X, SCREEN_3X), not one entry
      // listing them all.
      const entry = new RegExp(
        `\\{"type":"RASTER","id":"${id}","version":\\d+,"files":\\[\\{"url":"(_assets/media/[0-9a-f]+\\.(?:png|jpe?g|webp))","urlDenied":false,"width":(\\d+),"height":(\\d+)`,
        "g",
      );
      let best: Slide | null = null;
      for (const f of html.matchAll(entry)) {
        const w = Number(f[2]);
        if (!best || w > best.w) best = { src: "/" + f[1], w, h: Number(f[3]) };
      }
      if (best) slides.push(best);
    }
    // One photo is not a slideshow; leave Canva's hero in place.
    return slides.length >= 2 ? slides : [];
  } catch (error) {
    console.warn("[slideshow] could not read the gallery photos:", error);
    return [];
  }
}

/**
 * Landscape screens get only the landscape photos, when there are enough of
 * them: a portrait photo stretched across a desktop is upscaled ~2.5x and
 * shows it. The script applies the same rule, so the preload matches.
 */
const landscapeOnly = (slides: Slide[]) => {
  const wide = slides.filter((s) => s.w > s.h);
  return wide.length >= 3 ? wide : slides;
};

/**
 * Preloads the first photo for each orientation, so it downloads with the HTML
 * instead of after Canva's JS has rendered. Guests land on the cover (/) and
 * tap through, so the cover preloads it too. Low priority, as measured for the
 * old hero: as fast as high, and it competes less with Canva's own scripts.
 */
export function renderSlideshowPreload(slides: Slide[], pathname: string): string {
  if (!slides.length || (pathname !== "/" && !pathname.startsWith(ROUTE_PREFIX))) return "";
  const portrait = slides[0].src;
  const landscape = landscapeOnly(slides)[0].src;
  const link = (href: string, media: string) =>
    `<link rel="preload" as="image" href="${href}" media="${media}" fetchpriority="low">`;
  return portrait === landscape
    ? link(portrait, "all")
    : link(portrait, "(orientation: portrait)") + link(landscape, "(orientation: landscape)");
}

const arrow = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
  `<path d="${d}"/></svg>`;

/**
 * Sizes are in em from a root font-size the script sets: 16px divided by
 * Canva's page scale, so text keeps its size wherever Canva shrinks the page.
 * Never rem - Canva sets `html { font-size: 10px }`.
 */
const STYLES = `
  #sj-hero {
    position: relative;
    overflow: hidden;
    width: 100%;
    background: #2b2522;
    color: #fff;
    font-family: ${FONT};
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  #sj-hero * { box-sizing: border-box; }

  #sj-hero .sj-hero-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 1200ms ease;
  }
  #sj-hero .sj-hero-slide.is-on { opacity: 1; z-index: 1; }
  #sj-hero .sj-hero-slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transform: scale(1.08);
    transition: opacity 900ms ease, transform 7000ms ease-out;
  }
  #sj-hero .sj-hero-slide img.is-loaded { opacity: 1; }
  /* A slow push-in while a photo is showing. */
  #sj-hero .sj-hero-slide.is-on img { transform: scale(1); }

  /* Keeps white text legible on any photo: darker at the top for the nav and
     at the bottom for the dots, a soft wash in the middle for the names. */
  #sj-hero .sj-hero-shade {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(20, 14, 16, 0.42) 0%, rgba(20, 14, 16, 0) 26%,
        rgba(20, 14, 16, 0) 62%, rgba(20, 14, 16, 0.5) 100%),
      rgba(20, 14, 16, 0.2);
  }

  #sj-hero button {
    margin: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    cursor: pointer;
  }
  #sj-hero button:focus-visible { outline: 1px solid rgba(255, 255, 255, 0.8); outline-offset: 4px; }

  #sj-hero .sj-hero-nav {
    position: absolute;
    z-index: 3;
    top: 5.6em;
    left: 0;
    right: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6em 2.2em;
    padding: 0 1.25em;
  }
  #sj-hero .sj-hero-nav > * {
    font-size: 0.75em;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
    transition: opacity 220ms ease;
  }
  /* The link under the mouse fades back, as in the nav on every other page
     (menu.ts). */
  @media (hover: hover) and (pointer: fine) {
    #sj-hero .sj-hero-nav > button:hover { opacity: 0.55; }
  }

  #sj-hero .sj-hero-copy {
    position: absolute;
    z-index: 3;
    left: 50%;
    top: 50%;
    width: min(92%, 52em);
    transform: translate(-50%, -50%);
    text-align: center;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.28);
    pointer-events: none;
  }
  #sj-hero .sj-hero-names {
    margin: 0;
    font-size: clamp(2.6em, 6.4vw, 5em);
    font-weight: 400;
    line-height: 1.08;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-wrap: balance;
  }

  /* The names rise into place as the page opens, and the divider, date and
     venue follow a beat apart. "both" holds each hidden through its delay, so
     nothing flashes in at full strength first. The distance is in px, not em,
     so all four travel the same way whatever their size. */
  #sj-hero .sj-hero-names,
  #sj-hero .sj-hero-rule,
  #sj-hero .sj-hero-date,
  #sj-hero .sj-hero-venue {
    animation: sj-hero-rise 1400ms cubic-bezier(0.22, 0.68, 0.24, 1) 250ms both;
  }
  #sj-hero .sj-hero-rule { animation-delay: 450ms; }
  #sj-hero .sj-hero-date { animation-delay: 650ms; }
  #sj-hero .sj-hero-venue { animation-delay: 850ms; }
  @keyframes sj-hero-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: none; }
  }
  #sj-hero .sj-hero-rule {
    position: relative;
    width: min(16em, 70%);
    height: 1px;
    margin: 1.4em auto 1.3em;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75) 30%,
      rgba(255, 255, 255, 0.75) 70%, transparent);
  }
  #sj-hero .sj-hero-rule::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%);
  }
  #sj-hero .sj-hero-date {
    margin: 0;
    font-size: 0.95em;
    letter-spacing: 0.3em;
    text-transform: uppercase;
  }
  #sj-hero .sj-hero-venue {
    margin: 0.35em 0 0;
    font-size: clamp(2em, 3.6vw, 2.9em);
    line-height: 1.3;
  }

  #sj-hero .sj-hero-arrow {
    position: absolute;
    z-index: 3;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.1em;
    height: 3.1em;
    margin-top: -1.55em;
    border: 1px solid rgba(255, 255, 255, 0.55);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    transition: background-color 180ms ease;
  }
  #sj-hero .sj-hero-arrow:hover { background: rgba(255, 255, 255, 0.26); }
  #sj-hero .sj-hero-arrow svg { width: 1.3em; height: 1.3em; }
  #sj-hero .sj-hero-prev { left: 1.6em; }
  #sj-hero .sj-hero-next { right: 1.6em; }

  #sj-hero .sj-hero-foot {
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 1.6em;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9em;
  }
  #sj-hero .sj-hero-dots { display: flex; gap: 0.25em; }
  /* A generous tap target around a small dot. */
  #sj-hero .sj-hero-dots button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    height: 1.5em;
  }
  #sj-hero .sj-hero-dots button::before {
    content: "";
    width: 0.45em;
    height: 0.45em;
    border-radius: 0.3em;
    background: rgba(255, 255, 255, 0.55);
    transition: width 300ms ease, background-color 300ms ease;
  }
  #sj-hero .sj-hero-dots button[aria-current]::before { width: 1.5em; background: #fff; }
  #sj-hero .sj-hero-scroll {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
    font-size: 0.7em;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    opacity: 0.9;
  }
  #sj-hero .sj-hero-scroll svg { width: 1.6em; height: 1.6em; animation: sj-hero-bob 2.2s ease-in-out infinite; }
  @keyframes sj-hero-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(0.35em); }
  }

  @media (max-width: 600px) {
    #sj-hero .sj-hero-names { letter-spacing: 0.1em; }
    #sj-hero .sj-hero-date { font-size: 0.85em; letter-spacing: 0.24em; }
    /* Swipe does the work on a phone. The arrows stay, small, level with the
       dots - mid-height they sat on the names. */
    #sj-hero .sj-hero-arrow { top: auto; bottom: 4.6em; width: 2.4em; height: 2.4em; margin-top: 0; }
    #sj-hero .sj-hero-prev { left: 1em; }
    #sj-hero .sj-hero-next { right: 1em; }
  }

  /* A phone on its side leaves ~390px: pull everything in. */
  @media (max-height: 520px) {
    #sj-hero .sj-hero-names { font-size: 2.3em; }
    #sj-hero .sj-hero-rule { margin: 0.8em auto 0.75em; }
    #sj-hero .sj-hero-venue { font-size: 1.8em; }
    #sj-hero .sj-hero-foot { bottom: 0.9em; }
    #sj-hero .sj-hero-scroll { display: none; }
    #sj-hero .sj-hero-arrow { top: 50%; bottom: auto; margin-top: -1.2em; }
  }

  /* On a phone the nav row gives way to the site-wide menu (menu.ts), which
     gets its links from window.__sjHeroNav. */
  @media ${MOBILE} {
    #sj-hero .sj-hero-nav { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    #sj-hero .sj-hero-slide, #sj-hero .sj-hero-slide img { transition: opacity 400ms ease; }
    #sj-hero .sj-hero-slide img { transform: none; }
    #sj-hero .sj-hero-scroll svg { animation: none; }
    /* A plain fade: no movement. */
    #sj-hero .sj-hero-names, #sj-hero .sj-hero-rule,
    #sj-hero .sj-hero-date, #sj-hero .sj-hero-venue { animation-name: sj-hero-fade; }
    @keyframes sj-hero-fade { from { opacity: 0; } to { opacity: 1; } }
  }
`;

/** ES5 on purpose, like the other injected scripts: no build step transpiles it. */
const script = (slides: Slide[], pages: Record<string, string>) => `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var SLIDES = ${JSON.stringify(slides)};
  var PAGES = ${JSON.stringify(pages)};
  var INTERVAL = 5000;
  var ICON_PREV = ${JSON.stringify(arrow("M19 12H5M11 6l-6 6 6 6"))};
  var ICON_NEXT = ${JSON.stringify(arrow("M5 12h14M13 6l6 6-6 6"))};
  var ICON_DOWN = ${JSON.stringify(arrow("M12 5v14M6 13l6 6 6-6"))};

  var root = null;      // our section
  var hero = null;      // Canva's hero, hidden while ours is up
  var copy = null;      // what was read from Canva's hero
  var list = [];        // the slides for this screen's orientation
  var index = 0;
  var timer = 0;
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onRoute() {
    return location.pathname.indexOf(ROUTE) === 0;
  }

  function landscape() {
    return window.matchMedia ? matchMedia("(orientation: landscape)").matches
      : window.innerWidth > window.innerHeight;
  }

  /* Must match landscapeOnly() at the edge, or the preload is wasted. */
  function pickSlides() {
    if (!landscape()) return SLIDES;
    var wide = [];
    for (var i = 0; i < SLIDES.length; i++) if (SLIDES[i].w > SLIDES[i].h) wide.push(SLIDES[i]);
    return wide.length >= 3 ? wide : SLIDES;
  }

  /* The first section of the page: the first <section> whose parent stacks
     several of them. Ours is skipped, since it is the one in front. */
  function canvaHero() {
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      if (s.id === "sj-hero") continue;
      var parent = s.parentElement;
      if (parent && parent.getElementsByTagName("section").length > 1) {
        for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
          if (c.tagName === "SECTION" && c.id !== "sj-hero") return c;
        }
      }
    }
    return null;
  }

  function scrollerOf(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === "scroll" || oy === "auto") && p.clientHeight) return p;
    }
    return null;
  }

  /**
   * Reads the names, date, venue and nav from Canva's hero, with the font each
   * one is set in. The nav is the text level with any of Canva's page links -
   * any, not the first: with larger nav text Canva wraps it onto two rows on a
   * phone, and matching only the first link's row once switched the slideshow
   * off there. Null until Canva has finished drawing the text.
   */
  function readCopy(section) {
    var links = section.querySelectorAll('a[href^="#page-"]');
    var linkTops = [];
    for (var l = 0; l < links.length; l++) linkTops.push(links[l].getBoundingClientRect().top);
    function navRow(top) {
      for (var i = 0; i < linkTops.length; i++) if (Math.abs(top - linkTops[i]) < 8) return true;
      return false;
    }
    var nav = [], rest = [];
    var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      var text = n.nodeValue.replace(/\\s+/g, " ").trim();
      if (!text) continue;
      var el = n.parentElement;
      var r = el.getBoundingClientRect();
      if (!r.width) continue;
      var cs = getComputedStyle(el);
      var item = { text: text, top: r.top, left: r.left, size: parseFloat(cs.fontSize), font: cs.fontFamily };
      var link = el.closest("a");
      if (navRow(r.top)) {
        item.href = link ? link.getAttribute("href") : null;
        nav.push(item);
      } else {
        rest.push(item);
      }
    }
    if (!rest.length) return null;

    rest.sort(function (a, b) { return a.top - b.top; });
    /* Canva's reading order: row by row, then left to right. */
    nav.sort(function (a, b) { return Math.abs(a.top - b.top) < 8 ? a.left - b.left : a.top - b.top; });
    /* Read by position, not size - the venue's script face is bigger than the
       names. The date is the first line with a digit in it, whatever its
       format ("7 FEBRUARY 2027" became "02 . 07 . 27" in Canva, and a
       four-digit-year test silently turned the slideshow off); the names sit
       above it, the venue below. */
    var names = [], date = null, venue = null;
    for (var j = 0; j < rest.length; j++) {
      var t = rest[j];
      if (!date && /\\d/.test(t.text)) date = t;
      else if (!date) names.push(t);
      else if (!venue) venue = t;
    }
    /* Canva lays text out in stages - first unstyled, in one font and size -
       so a read only counts once it looks finished: names clearly bigger than
       the date, and every page link found in the nav row. Otherwise the next
       tick reads again. */
    if (!date || !names.length || names.length > 3 || date.size * 1.5 > names[0].size) return null;
    var linked = 0;
    for (var q = 0; q < nav.length; q++) if (nav[q].href) linked++;
    if (linked < links.length) return null;
    return { names: names, date: date, venue: venue, nav: nav };
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* Canva's own font first, ours as the fallback. */
  function fontOf(item) {
    return item.font + ", " + ${JSON.stringify(FONT)};
  }

  function build() {
    list = pickSlides();
    index = 0;
    var section = el("section");
    section.id = "sj-hero";
    section.setAttribute("aria-roledescription", "carousel");
    section.setAttribute("aria-label", "Photos");

    var slides = el("div", "sj-hero-slides");
    for (var i = 0; i < list.length; i++) {
      var slide = el("div", "sj-hero-slide");
      slide.setAttribute("aria-hidden", "true");
      var img = el("img");
      img.alt = "";
      img.decoding = "async";
      img.onload = function () { this.className = "is-loaded"; };
      slide.appendChild(img);
      slides.appendChild(slide);
    }
    section.appendChild(slides);
    section.appendChild(el("div", "sj-hero-shade"));

    if (copy.nav.length) {
      var nav = el("nav", "sj-hero-nav");
      nav.setAttribute("aria-label", "Pages");
      for (var k = 0; k < copy.nav.length; k++) {
        var item = copy.nav[k];
        var node = el(item.href ? "button" : "span");
        node.textContent = item.text;
        node.style.fontFamily = fontOf(item);
        if (item.href) {
          node.type = "button";
          node.setAttribute("data-href", item.href);
        }
        /* HOME is plain text on some Canva layouts and a link on others. */
        if (!item.href || pathFor(item.href) === location.pathname) node.setAttribute("aria-current", "page");
        nav.appendChild(node);
      }
      section.appendChild(nav);
    }
    /* Canva's hero, where its nav lives, is about to be hidden; the phone
       menu (menu.ts) reads the links from here instead. */
    window.__sjHeroNav = copy.nav;

    var text = el("div", "sj-hero-copy");
    var names = el("h1", "sj-hero-names");
    var parts = [];
    for (var m = 0; m < copy.names.length; m++) parts.push(copy.names[m].text);
    names.textContent = parts.join(" ");
    names.style.fontFamily = fontOf(copy.names[0]);
    text.appendChild(names);
    text.appendChild(el("div", "sj-hero-rule"));
    if (copy.date) {
      var date = el("p", "sj-hero-date");
      date.textContent = copy.date.text;
      date.style.fontFamily = fontOf(copy.date);
      text.appendChild(date);
    }
    if (copy.venue) {
      var venue = el("p", "sj-hero-venue");
      venue.textContent = copy.venue.text;
      venue.style.fontFamily = fontOf(copy.venue);
      text.appendChild(venue);
    }
    section.appendChild(text);

    var prev = el("button", "sj-hero-arrow sj-hero-prev", ICON_PREV);
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous photo");
    prev.setAttribute("data-act", "prev");
    var next = el("button", "sj-hero-arrow sj-hero-next", ICON_NEXT);
    next.type = "button";
    next.setAttribute("aria-label", "Next photo");
    next.setAttribute("data-act", "next");
    section.appendChild(prev);
    section.appendChild(next);

    var foot = el("div", "sj-hero-foot");
    var dots = el("div", "sj-hero-dots");
    for (var d = 0; d < list.length; d++) {
      var dot = el("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Photo " + (d + 1) + " of " + list.length);
      dot.setAttribute("data-act", "dot");
      dot.setAttribute("data-index", String(d));
      dots.appendChild(dot);
    }
    foot.appendChild(dots);
    var down = el("button", "sj-hero-scroll", "Scroll down" + ICON_DOWN);
    down.type = "button";
    down.setAttribute("data-act", "down");
    down.style.fontFamily = copy.date ? fontOf(copy.date) : "";
    foot.appendChild(down);
    section.appendChild(foot);

    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    return section;
  }

  /* ---------- the slides ---------------------------------------------- */

  /* Photos load as they are needed: the one showing and the one after it. */
  function load(i) {
    var img = root.querySelectorAll(".sj-hero-slide img")[i];
    if (img && !img.getAttribute("src")) {
      if (i === index) img.setAttribute("fetchpriority", "high");
      img.src = list[i].src;
    }
  }

  function show(i) {
    if (!root || !list.length) return;
    index = (i + list.length) % list.length;
    var slides = root.querySelectorAll(".sj-hero-slide");
    var dots = root.querySelectorAll(".sj-hero-dots button");
    for (var s = 0; s < slides.length; s++) {
      slides[s].classList.toggle("is-on", s === index);
      if (s === index) dots[s].setAttribute("aria-current", "true");
      else dots[s].removeAttribute("aria-current");
    }
    load(index);
    load((index + 1) % list.length);
    schedule();
  }

  /* Restarted on every change, so a guest who just moved the slides gets a
     full five seconds before it moves on by itself. */
  function schedule() {
    window.clearTimeout(timer);
    if (reduced) return;
    timer = window.setTimeout(advance, INTERVAL);
  }

  /* Not while the tab is hidden or the slideshow is scrolled out of sight:
     that would only download photos nobody sees. */
  function advance() {
    if (!root || !root.isConnected) return;
    var r = root.getBoundingClientRect();
    if (document.hidden || r.bottom <= 0) { schedule(); return; }
    show(index + 1);
  }

  /* ---------- size ---------------------------------------------------- */

  /**
   * One screen tall: the height of the box Canva scrolls. Divided by Canva's
   * page scale (it shrinks the whole page with a transform on narrow screens),
   * as is the root font-size, so what the guest sees is screen-sized.
   */
  function size() {
    var parent = root.parentElement;
    if (!parent || !parent.offsetWidth) return;
    var k = parent.getBoundingClientRect().width / parent.offsetWidth || 1;
    var scroller = scrollerOf(root);
    var h = (scroller ? scroller.clientHeight : window.innerHeight) / k;
    var height = Math.round(h) + "px";
    var font = (16 / k).toFixed(3) + "px";
    if (root.style.height !== height) root.style.height = height;
    if (root.style.fontSize !== font) root.style.fontSize = font;
  }

  /* ---------- input --------------------------------------------------- */

  /* "#page-2" -> "/details", from Canva's page order; null if unknown. */
  function pathFor(href) {
    var m = /^#page-(\\d+)$/.exec(href || "");
    var slug = m ? PAGES[Number(m[1])] : null;
    return slug == null ? null : "/" + slug;
  }

  /**
   * Changes page through Canva's own router: push the address, then tell the
   * router with a popstate, exactly as the back button would. No reload, so
   * the music carries on. Clicking Canva's hidden link instead only worked in
   * its portrait-phone layout; on desktop and landscape it did nothing. The
   * current page just scrolls back to the top.
   */
  function goTo(href) {
    var path = pathFor(href);
    if (path === null) {
      var target = hero && hero.querySelector('a[href="' + href + '"]');
      if (target) target.click();
      return;
    }
    if (path === location.pathname) {
      var scroller = scrollerOf(root);
      if (scroller) scroller.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }

  function act(button) {
    var what = button.getAttribute("data-act");
    if (what === "prev") show(index - 1);
    else if (what === "next") show(index + 1);
    else if (what === "dot") show(Number(button.getAttribute("data-index")));
    else if (what === "down") {
      var scroller = scrollerOf(root);
      if (scroller) scroller.scrollTo({ top: root.getBoundingClientRect().height, behavior: reduced ? "auto" : "smooth" });
    }
    else if (button.getAttribute("data-href")) goTo(button.getAttribute("data-href"));
  }

  /**
   * By position, not by event.target: Canva swaps the element under the
   * pointer between pointerdown and mouseup, so the click can land on <body>.
   */
  function buttonAt(x, y) {
    if (!root || !root.isConnected) return null;
    var buttons = root.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var r = buttons[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return buttons[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    if (!onRoute()) return;
    if (e.target && e.target.closest && e.target.closest("#bgm-toggle")) return;
    /* The phone menu and music button float over the slideshow; a tap on
       them is theirs. They are ours, not Canva's, so the top element at the
       point is reliable here. */
    var over = e.detail !== 0 && document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest && over.closest("#sj-menu, #bgm-toggle")) return;
    var hit = buttonAt(e.clientX, e.clientY);
    /* A keyboard "click" has no position; its target is reliable. */
    if (!hit && e.detail === 0 && root && root.contains(e.target)) hit = e.target.closest("button");
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    act(hit);
  }, true);

  var touch = null;
  function onTouchStart(e) {
    touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }
  function onTouchEnd(e) {
    if (!touch || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touch.x;
    var dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
  }

  document.addEventListener("keydown", function (e) {
    if (!root || !root.isConnected || !onRoute()) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (root.getBoundingClientRect().bottom <= 0) return;
    show(index + (e.key === "ArrowRight" ? 1 : -1));
  });

  /* ---------- mounting ------------------------------------------------ */

  function unmount() {
    window.clearTimeout(timer);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (hero) hero.style.display = "";
    root = null;
    hero = null;
  }

  /**
   * Canva re-renders and routes client-side, so this runs often and assumes
   * nothing survived: it re-reads a replaced hero, re-inserts a detached
   * section, and takes everything down off the route.
   */
  function sync() {
    if (!document.body) return;
    if (!onRoute() || !SLIDES.length) { if (root || hero) unmount(); return; }

    var section = canvaHero();
    if (!section) return;

    if (section !== hero) {
      /* A new hero (first visit, or Canva re-rendered the page): read it while
         it is still visible, then put ours in front of it. */
      var read = readCopy(section);
      if (!read) return;
      if (hero) hero.style.display = "";
      copy = read;
      hero = section;
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = build();
    }

    if (root.nextElementSibling !== hero) hero.parentNode.insertBefore(root, hero);
    if (hero.style.display !== "none") hero.style.display = "none";
    size();
    if (!root.querySelector(".sj-hero-slide.is-on")) show(0);
  }

  var pending = false;
  function queue() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () { pending = false; sync(); });
  }

  /* A rotation changes which photos suit the screen, so rebuild for it. */
  var wasLandscape = landscape();
  window.addEventListener("resize", function () {
    if (landscape() !== wasLandscape) {
      wasLandscape = landscape();
      if (root) unmount();
    }
    sync();
  });

  if (window.MutationObserver) {
    new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
  }
  /* Canva routes with pushState, which fires no event, so a slow poll too. */
  window.addEventListener("popstate", sync);
  window.setInterval(sync, 700);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderSlideshow(nonce: string | null, slides: Slide[], pages: Record<string, string>): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${script(slides, pages)}</script>\n`;
}
