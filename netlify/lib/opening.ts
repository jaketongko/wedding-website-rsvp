/**
 * Full-screen openings for the Our Story, Details and Gallery pages: each
 * page's first Canva section is replaced by one of ours, one screen tall on
 * desktop and phone - Canva's photo filling the screen, the nav, and the
 * section's lines rising in one after another. (The main page has its own
 * slideshow, slideshow.ts.)
 *
 * Seamless by construction: from the first moment on one of these routes, CSS
 * holds Canva's section invisible at that same full-screen height, so
 * everything below is already where it will end up and the swap moves
 * nothing. (Stretching Canva's section after it drew is what made the old
 * hero jump.)
 *
 *   section parent        <- Canva's sections, in normal flow
 *     section#sj-shero    <- ours, 100svh
 *     section (hidden)    <- Canva's opening section
 *     section ...         <- the rest of the page, untouched
 *
 * Nothing the couple edits in Canva is hard-coded:
 *  - the photo is the page's first image in Canva's page data, read on every
 *    request and preloaded with the HTML;
 *  - the lines and nav, and their fonts, are read from Canva's section at
 *    runtime. Pieces of text side by side ("DATE", "and", "VENUE") make one
 *    line; a page may have no lines at all (Gallery: photo and nav only);
 *    the nav stays at the bottom where Canva puts it there.
 * Canva's sections are found by their ids (findSections), so the page being
 * faded out during a page change is never mistaken for the new one. If a
 * section cannot be read within 8s it is handed back, never left blank.
 */
import { MOBILE } from "./player.ts";
import { FONT } from "./rsvp.ts";

/** The pages that open full-screen, by slug; "our-story-2" counts as
 *  "our-story". */
const ROUTES = ["our-story", "details", "gallery"];

const routeOf = (slug: string) => ROUTES.find((r) => slug === r || slug.startsWith(r + "-")) ?? null;

/**
 * Each opening page's photo, read from Canva's page data on every request
 * (the couple swaps photos in Canva; hashes change each publish):
 *
 *   page index    {"K":"PB1h8M...","L":"our-story", ...}
 *   page content  "a":"PB1h8M..." ... its first image fill,
 *                 "a":{"B":{"A":{"A?":"d","A":"<upload>","B":1},"I":{"A?":"d","A":"<edited>"...
 *                 ("I" is the edited copy Canva actually shows)
 *   media table   one entry per size; the widest is used
 *
 * A page whose photo cannot be found is left out: the script then takes the
 * photo Canva draws.
 */
export function findOpeningPhotos(html: string): Record<string, string> {
  const photos: Record<string, string> = {};
  try {
    for (const [, key, slug] of html.matchAll(/"K":"([A-Za-z0-9_-]+)","L":"([a-z0-9-]*)"/g)) {
      if (!routeOf(slug)) continue;
      const start = html.indexOf(`"a":"${key}"`);
      if (start === -1) continue;
      // An image element ("a") or the section's own background ("D", as on
      // Details since 2026-10-04); an optional flag may come first ("A":true).
      const ref = /"(?:a|D)":\{(?:"A":(?:true|false),)?"B":\{"A":\{"A\?":"d","A":"([A-Za-z0-9_-]+)","B":\d+\}(?:,"I":\{"A\?":"d","A":"([A-Za-z0-9_-]+)")?/
        .exec(html.slice(start, start + 20000));
      if (!ref) continue;
      const id = ref[2] ?? ref[1];
      const entry = new RegExp(
        `\\{"type":"RASTER","id":"${id}","version":\\d+,"files":\\[\\{"url":"(_assets/media/[0-9a-f]+\\.(?:png|jpe?g|webp))","urlDenied":false,"width":(\\d+)`,
        "g",
      );
      let best: { url: string; width: number } | null = null;
      for (const m of html.matchAll(entry)) {
        const width = Number(m[2]);
        if (!best || width > best.width) best = { url: "/" + m[1], width };
      }
      if (best) photos[slug] = best.url;
    }
  } catch (error) {
    console.warn("[opening] could not read the opening photos:", error);
  }
  return photos;
}

/** Starts the page's opening photo downloading with the HTML on a direct visit. */
export function renderOpeningPreload(photos: Record<string, string>, pathname: string): string {
  const photo = photos[pathname.replace(/^\/+|\/+$/g, "")];
  return photo ? `<link rel="preload" as="image" href="${photo}" fetchpriority="high">` : "";
}

const styles = (heroSelector: string) => `
  /* From the first moment on an opening route, Canva's opening section is
     held invisible at full-screen height: swapping in ours moves nothing. */
  ${heroSelector} {
    visibility: hidden !important;
    min-height: 100vh;
    min-height: 100svh;
  }
  /* Read, then hidden: out of the flow while its text is being read. */
  section.sj-shero-reading {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 100%;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #sj-shero {
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    width: 100%;
    height: 100vh;
    height: 100svh;
    background: #2b2522;
    color: #fff;
    /* Its own base size: Canva's root is 10px, which shrank everything. */
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }
  #sj-shero * { box-sizing: border-box; }
  #sj-shero .sj-shero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 45%;
    opacity: 0;
    transition: opacity 700ms ease;
  }
  #sj-shero .sj-shero-img.is-loaded { opacity: 1; }
  /* Keeps white text legible: darker at the top and the bottom. */
  #sj-shero .sj-shero-shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(180deg, rgba(20, 14, 16, 0.4) 0%, rgba(20, 14, 16, 0) 25%,
        rgba(20, 14, 16, 0) 50%, rgba(20, 14, 16, 0.55) 100%),
      rgba(20, 14, 16, 0.12);
  }
  #sj-shero .sj-shero-nav {
    position: absolute;
    z-index: 2;
    top: 6em;
    left: 0;
    right: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6em 2.2em;
    padding: 0 1.25em;
  }
  /* Where Canva puts the nav near the bottom (Gallery), so does this. */
  #sj-shero.sj-shero--nav-bottom .sj-shero-nav { top: auto; bottom: 9%; }
  #sj-shero .sj-shero-nav > * {
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font-size: 0.75em;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    transition: opacity 220ms ease;
  }
  #sj-shero .sj-shero-nav > span { cursor: default; }
  @media (hover: hover) and (pointer: fine) {
    #sj-shero .sj-shero-nav > button:hover { opacity: 0.55; }
  }
  #sj-shero .sj-shero-copy {
    position: absolute;
    z-index: 2;
    left: 50%;
    bottom: 11%;
    width: min(92%, 64em);
    transform: translateX(-50%);
    text-align: center;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.3);
  }
  #sj-shero .sj-shero-copy p {
    margin: 0 0 0.35em;
    line-height: 1.15;
    text-wrap: balance;
  }
  #sj-shero .sj-shero-copy p:last-child { margin-bottom: 0; }
  /* Each piece keeps its size from Canva, scaled down on narrow screens. */
  #sj-shero .sj-shero-copy span {
    font-size: max(0.8em, calc(var(--sj-size) * var(--sj-scale, 1)));
  }
  #sj-shero .sj-shero-copy span + span { margin-left: 0.3em; }
  @media (max-width: 1000px) { #sj-shero { --sj-scale: 0.8; } }
  @media (max-width: 600px) {
    #sj-shero { --sj-scale: 0.62; }
    #sj-shero .sj-shero-copy { bottom: 15%; }
  }
  /* Phones: the menu button (menu.ts) stands in for the nav row. */
  @media ${MOBILE} {
    #sj-shero .sj-shero-nav { display: none; }
  }

  /* The lines rise into place one after another, as the names do on the
     main page (slideshow.ts). "both" holds each hidden through its delay. */
  #sj-shero .sj-rise { animation: sj-shero-rise 1000ms cubic-bezier(0.22, 0.68, 0.24, 1) both; }
  @keyframes sj-shero-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    #sj-shero .sj-rise { animation-name: sj-shero-fade; }
    @keyframes sj-shero-fade { from { opacity: 0; } to { opacity: 1; } }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const script = (
  routes: string[],
  photos: Record<string, string>,
  pages: Record<string, string>,
  sections: Record<string, string[]>,
) => `
(function () {
  var ROUTES = ${JSON.stringify(routes)};
  var PHOTOS = ${JSON.stringify(photos)};
  var PAGES = ${JSON.stringify(pages)};
  var SECTIONS = ${JSON.stringify(sections)};
  var FALLBACK_FONT = ${JSON.stringify(FONT)};
  var GIVE_UP = 8000;

  var shero = null;     // our opening section
  var heroSrc = null;   // Canva's, hidden behind ours
  var heroCopy = null;  // its nav and lines, read once per visit
  var confirmed = false; // Canva's live text has been read this visit
  var heroCount = -1, heroSince = 0, heroFirst = 0, failed = false;

  function slug() {
    return location.pathname.replace(/^\\/+|\\/+$/g, "");
  }

  function onRoute() {
    var s = slug();
    for (var i = 0; i < ROUTES.length; i++) {
      if (s === ROUTES[i] || s.indexOf(ROUTES[i] + "-") === 0) return true;
    }
    return false;
  }

  function ours(section) {
    return (section.id || "").indexOf("sj-") === 0;
  }

  /* Canva's opening section on this page: by id when the page data lists it
     (during a page change the old page is still in the document); null until
     Canva has drawn this page. */
  function canvaHero() {
    var ids = SECTIONS[slug()];
    if (ids && ids.length) return document.getElementById(ids[0]);
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      if (ours(sections[i])) continue;
      var parent = sections[i].parentElement;
      if (!parent || parent.getElementsByTagName("section").length < 2) continue;
      for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
        if (c.tagName === "SECTION" && !ours(c)) return c;
      }
    }
    return null;
  }

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  /* A line's words, with Canva's <br>s as spaces. Not innerText: the section
     is invisible while being read, and innerText then drops the breaks. */
  function textOf(node) {
    var copy = node.cloneNode(true);
    var breaks = copy.getElementsByTagName("br");
    while (breaks.length) breaks[0].parentNode.replaceChild(document.createTextNode(" "), breaks[0]);
    return (copy.textContent || "").replace(/\\s+/g, " ").trim();
  }

  function look(node) {
    var cs = getComputedStyle(node.querySelector("span") || node);
    return {
      font: cs.fontFamily,
      size: parseFloat(cs.fontSize),
      upper: cs.textTransform === "uppercase",
      italic: cs.fontStyle === "italic",
      spacing: parseFloat(cs.letterSpacing) || 0,
    };
  }

  /* "#page-2" -> "/details", from Canva's page numbers; null if unknown. */
  function pathFor(href) {
    var m = /^#page-(\\d+)$/.exec(href || "");
    var s = m ? PAGES[m[1]] : null;
    return s == null ? null : "/" + s;
  }

  /**
   * The nav (text level with one of Canva's page links) and the other lines -
   * pieces side by side grouped into one line - each with its look, in
   * reading order. Null until Canva has drawn the text styled.
   */
  function readHero(section) {
    var sr = section.getBoundingClientRect();
    var links = section.querySelectorAll('a[href^="#page-"]');
    var tops = [];
    for (var l = 0; l < links.length; l++) {
      var lr = links[l].getBoundingClientRect();
      if (!lr.width) return null;
      tops.push(lr.top);
    }
    /* Read as soon as Canva has laid the text out. (Waiting for Canva's own
       fade-in to finish as well cost ~0.7s on every visit.) */
    var nav = [], pieces = [];
    var ps = section.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      var words = textOf(ps[i]);
      var r = ps[i].getBoundingClientRect();
      if (!words || !r.width) continue;
      var item = { text: words, top: r.top, left: r.left, mid: r.top + r.height / 2, look: look(ps[i]) };
      var isNav = false;
      for (var t = 0; t < tops.length; t++) if (Math.abs(r.top - tops[t]) < 8) isNav = true;
      if (isNav) {
        var a = ps[i].closest("a") || ps[i].querySelector("a");
        item.href = a ? a.getAttribute("href") : null;
        nav.push(item);
      } else {
        pieces.push(item);
      }
    }
    if (!pieces.length && nav.length < 2) return null;
    /* Styled: the biggest text clearly bigger than the smallest (Canva first
       lays it all out in one size). */
    if (pieces.length > 1) {
      var big = 0, small = Infinity;
      for (var s = 0; s < pieces.length; s++) {
        big = Math.max(big, pieces[s].look.size);
        small = Math.min(small, pieces[s].look.size);
      }
      if (big < small * 1.6) return null;
    }
    /* Pieces whose middles are level make one line ("DATE" "and" "VENUE"). */
    pieces.sort(function (a, b) { return a.mid - b.mid; });
    var rows = [];
    for (var p = 0; p < pieces.length; p++) {
      var row = rows[rows.length - 1];
      if (row && Math.abs(row[0].mid - pieces[p].mid) < Math.max(10, row[0].look.size * 0.6)) row.push(pieces[p]);
      else rows.push([pieces[p]]);
    }
    for (var w = 0; w < rows.length; w++) rows[w].sort(function (a, b) { return a.left - b.left; });
    nav.sort(function (a, b) { return Math.abs(a.top - b.top) < 8 ? a.left - b.left : a.top - b.top; });
    var navBottom = nav.length && sr.height ? nav[0].top - sr.top > sr.height * 0.5 : false;
    return { nav: nav, rows: rows, navBottom: navBottom };
  }

  /* The photo: from Canva's page data (preloaded with the page), else the
     biggest image Canva has drawn in its section - by its own pixel size,
     since the section may already be hidden. */
  function heroImage(section) {
    if (PHOTOS[slug()]) return PHOTOS[slug()];
    var best = null, area = 0;
    var imgs = section.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; i++) {
      var a = imgs[i].naturalWidth * imgs[i].naturalHeight;
      if (a > area && (imgs[i].currentSrc || imgs[i].src)) { area = a; best = imgs[i]; }
    }
    return best ? best.currentSrc || best.src : null;
  }

  function buildHero() {
    var s = el("section");
    s.id = "sj-shero";
    s.appendChild(el("div", "sj-shero-shade"));
    return s;
  }

  function addHeroImage(src) {
    var img = el("img", "sj-shero-img");
    img.alt = "";
    img.decoding = "async";
    img.setAttribute("fetchpriority", "high");
    img.onload = function () { this.classList.add("is-loaded"); };
    img.src = src;
    if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
    shero.insertBefore(img, shero.firstChild);
  }

  function styleLike(node, src) {
    node.style.fontFamily = src.look.font + ", " + FALLBACK_FONT;
    if (src.look.upper) node.style.textTransform = "uppercase";
    if (src.look.italic) node.style.fontStyle = "italic";
  }

  /* Fills our section with heroCopy. Again later (animate false) if Canva's
     live text turns out to differ from the copy remembered from last time. */
  function fillHero(animate) {
    var old = shero.querySelectorAll(".sj-shero-nav, .sj-shero-copy");
    for (var x = 0; x < old.length; x++) old[x].parentNode.removeChild(old[x]);
    shero.classList.toggle("sj-shero--nav-bottom", !!heroCopy.navBottom);
    if (heroCopy.nav.length) {
      var nav = el("nav", "sj-shero-nav");
      nav.setAttribute("aria-label", "Pages");
      for (var k = 0; k < heroCopy.nav.length; k++) {
        var item = heroCopy.nav[k];
        var node = el(item.href ? "button" : "span");
        node.textContent = item.text;
        node.style.fontFamily = item.look.font + ", " + FALLBACK_FONT;
        if (item.href) {
          node.type = "button";
          node.setAttribute("data-href", item.href);
        }
        if (!item.href || pathFor(item.href) === location.pathname) node.setAttribute("aria-current", "page");
        nav.appendChild(node);
      }
      shero.appendChild(nav);
    }
    if (heroCopy.rows.length) {
      var copy = el("div", "sj-shero-copy");
      for (var n = 0; n < heroCopy.rows.length; n++) {
        var line = el("p", animate ? "sj-rise" : null);
        for (var m = 0; m < heroCopy.rows[n].length; m++) {
          var src = heroCopy.rows[n][m];
          var piece = el("span");
          piece.textContent = src.text;
          styleLike(piece, src);
          piece.style.setProperty("--sj-size", (src.look.size / 16).toFixed(3) + "em");
          if (src.look.spacing) piece.style.letterSpacing = (src.look.spacing / src.look.size).toFixed(3) + "em";
          line.appendChild(piece);
        }
        if (animate) line.style.animationDelay = 60 + n * 160 + "ms";
        copy.appendChild(line);
      }
      shero.appendChild(copy);
      shero.setAttribute("aria-label", textOf(copy));
    }
    /* The phone menu (menu.ts) reads its links from here: Canva's own nav is
       inside the hidden section. */
    var shared = [];
    for (var j = 0; j < heroCopy.nav.length; j++) {
      shared.push({ text: heroCopy.nav[j].text, href: heroCopy.nav[j].href, font: heroCopy.nav[j].look.font });
    }
    window.__sjHeroNav = shared;
  }

  /* Whether a node can be seen at all. */
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

  /**
   * Leaving a page. Nothing is restored while Canva fades the old page out -
   * un-hiding its section there flashed the original design. Ours stays
   * until Canva removes that page (or hides it), then goes.
   */
  var leftBehind = [];
  function settleLeftBehind(force) {
    for (var i = leftBehind.length - 1; i >= 0; i--) {
      var l = leftBehind[i];
      var gone = !l.anchor.isConnected;
      if (!gone && !force && onScreen(l.node)) continue;
      if (l.node.parentNode) l.node.parentNode.removeChild(l.node);
      if (!gone) {
        l.anchor.classList.remove("sj-shero-reading");
        l.anchor.style.display = "";
      }
      leftBehind.splice(i, 1);
    }
  }

  function reset() {
    shero = null;
    heroSrc = null;
    heroCopy = null;
    confirmed = false;
    heroCount = -1;
    heroFirst = 0;
  }

  /* ---------- remembered copies ---------- */

  /* What is shown, without positions: equal signatures mean nothing to
     change. */
  function signature(c) {
    var parts = [c.navBottom ? "b" : "t"];
    for (var i = 0; i < c.nav.length; i++) parts.push(c.nav[i].text, c.nav[i].href, c.nav[i].look.font);
    for (var r = 0; r < c.rows.length; r++) {
      for (var p = 0; p < c.rows[r].length; p++) {
        var it = c.rows[r][p];
        parts.push(r, it.text, it.look.font, it.look.size, it.look.upper, it.look.italic, it.look.spacing);
      }
    }
    return JSON.stringify(parts);
  }

  /* Per page, in this browser only. Storage can be missing or full (private
     browsing): then every visit simply waits for Canva, as before. */
  var STORE = "sj-opening:";
  function recall() {
    try {
      var raw = window.localStorage.getItem(STORE + slug());
      var c = raw && JSON.parse(raw);
      return c && c.nav && c.rows ? c : null;
    } catch (e) {
      return null;
    }
  }
  function remember(c) {
    try {
      window.localStorage.setItem(STORE + slug(), JSON.stringify({ nav: c.nav, rows: c.rows, navBottom: c.navBottom }));
    } catch (e) { /* no storage: fine */ }
  }

  function giveBack() {
    if (shero && shero.parentNode) shero.parentNode.removeChild(shero);
    if (heroSrc) {
      heroSrc.classList.remove("sj-shero-reading");
      heroSrc.style.display = "";
    }
    reset();
  }

  function syncHero() {
    if (failed) return;
    var section = heroSrc && heroSrc.isConnected ? heroSrc : canvaHero();
    if (!section) return;
    if (section !== heroSrc) {
      if (heroSrc) { heroSrc.classList.remove("sj-shero-reading"); heroSrc.style.display = ""; }
      if (shero && shero.parentNode) shero.parentNode.removeChild(shero);
      reset();
      heroSrc = section;
    }
    if (!heroFirst) heroFirst = Date.now();
    if (!shero) shero = buildHero();
    if (shero.nextElementSibling !== heroSrc) heroSrc.parentNode.insertBefore(shero, heroSrc);

    if (!confirmed) {
      /* Out of the flow (ours holds the place) but still laid out, so its
         text can be read. */
      heroSrc.classList.add("sj-shero-reading");
      if (!shero.querySelector(".sj-shero-img")) {
        var src = heroImage(heroSrc);
        if (src) addHeroImage(src);
      }
      /* The title and nav remembered from this guest's last visit: shown at
         once, with the photo, instead of waiting for Canva's text. */
      if (!heroCopy) {
        var remembered = recall();
        if (remembered) { heroCopy = remembered; fillHero(true); }
      }
      var got = readHero(heroSrc);
      /* Canva draws the text in stages: take it once it has held still - a
         little longer for a page that is only a nav, which has no sizes to
         compare. */
      if (got) {
        var count = got.nav.length * 100 + got.rows.length;
        var hold = got.rows.length ? 100 : 300;
        if (count !== heroCount) { heroCount = count; heroSince = Date.now(); }
        if (Date.now() - heroSince < hold) { got = null; window.setTimeout(syncHero, 110); }
      }
      if (!got) {
        if (Date.now() - heroFirst > GIVE_UP) {
          if (heroCopy) {
            /* Canva's text never became readable: keep the remembered one. */
            confirmed = true;
          } else {
            /* Never leave a blank screen: give Canva's section back. */
            failed = true;
            giveBack();
            document.documentElement.classList.remove("sj-shero-route");
            return;
          }
        } else {
          return;
        }
      } else {
        /* Canva's live text wins: if the couple edited it since last time,
           the remembered copy is swapped out quietly (no second rise). */
        if (!heroCopy) { heroCopy = got; fillHero(true); }
        else if (signature(got) !== signature(heroCopy)) { heroCopy = got; fillHero(false); }
        remember(got);
        confirmed = true;
      }
    }
    /* Canva adds its photo a moment after its text: take it when it comes. */
    if (!shero.querySelector(".sj-shero-img")) {
      var late = heroImage(heroSrc);
      if (late) addHeroImage(late);
    }
    heroSrc.classList.remove("sj-shero-reading");
    if (heroSrc.style.display !== "none") heroSrc.style.display = "none";
  }

  function scrollerOf(node) {
    for (var p = node.parentElement; p && p !== document.body; p = p.parentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === "scroll" || oy === "auto") && p.clientHeight) return p;
    }
    return null;
  }

  /* Nav clicks: by position, not event.target (Canva swaps the element
     under the pointer between pointerdown and mouseup), through Canva's own
     router so the music carries on. The current page scrolls to the top. */
  document.addEventListener("click", function (e) {
    if (!shero || !shero.isConnected) return;
    var over = e.detail !== 0 && document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest && over.closest("#sj-menu, #bgm-toggle")) return;
    var buttons = shero.querySelectorAll(".sj-shero-nav button"), hit = null;
    for (var i = 0; i < buttons.length; i++) {
      var r = buttons[i].getBoundingClientRect();
      if (r.width && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) hit = buttons[i];
    }
    if (!hit && e.detail === 0 && shero.contains(e.target)) hit = e.target.closest && e.target.closest(".sj-shero-nav button");
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    var path = pathFor(hit.getAttribute("data-href"));
    if (path === null) return;
    if (path === location.pathname) {
      var sc = scrollerOf(shero);
      if (sc) sc.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    /* With a "key", as Canva's own links push their entries: its router
       ignores an entry without one. */
    var state = { key: Math.random().toString(36).slice(2, 8) };
    history.pushState(state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: state }));
  }, true);

  var lastSlug = slug();
  function sync() {
    if (!document.body) return;
    var here = onRoute();
    /* A different page: whatever we built belongs to the one being left. */
    if (slug() !== lastSlug) {
      lastSlug = slug();
      failed = false;
      if (shero && heroSrc && heroSrc.isConnected) leftBehind.push({ node: shero, anchor: heroSrc });
      else if (shero && shero.parentNode) shero.parentNode.removeChild(shero);
      reset();
    }
    /* Back on a page whose section we left hidden: hand it back first. */
    var mine = false, current = here ? canvaHero() : null;
    for (var lb = 0; lb < leftBehind.length; lb++) if (current && leftBehind[lb].anchor === current) mine = true;
    settleLeftBehind(mine);
    document.documentElement.classList.toggle("sj-shero-route", here && !failed);
    if (here) syncHero();
  }

  /* Set at once, before Canva draws anything, so its section never shows. */
  document.documentElement.classList.toggle("sj-shero-route", onRoute());

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
  window.setInterval(sync, 800);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderOpening(
  nonce: string | null,
  photos: Record<string, string>,
  pages: Record<string, string>,
  sections: Record<string, string[]>,
): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  // Canva's opening section on every opening page, by id; the generic "first
  // section" rule only if the page data names none.
  const heroIds = Object.keys(sections)
    .filter((s) => routeOf(s))
    .map((s) => sections[s][0])
    .filter((id) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id));
  const heroSelector = heroIds.length
    ? heroIds.map((id) => `html.sj-shero-route #${id}`).join(", ")
    : `html.sj-shero-route section:not([id^="sj-"]):first-of-type`;
  return `\n<style${nonceAttr}>${styles(heroSelector)}</style>\n<script${nonceAttr}>${script(ROUTES, photos, pages, sections)}</script>\n`;
}
