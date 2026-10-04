/**
 * The Our Story page's story section, re-set as minimal rounded cards with a
 * touch of lavender: a photo carousel on one side (arrows, dots, swipe) and
 * the event's date, title and story on the other, alternating sides on
 * desktop and stacked on a phone. The two quotes above the stories are
 * carried over, open on the paper in two columns.
 *
 * The approach, as for the main page's slideshow: leave Canva's layout alone
 * and put a section of our own in front of it.
 *
 *   section parent        <- Canva's sections, in normal flow
 *     section (hero)      <- untouched
 *     section#sj-story    <- ours
 *     section (hidden)    <- Canva's story section: display:none
 *
 * Nothing the couple edits in Canva is hard-coded. The quotes, dates, titles
 * and paragraphs - and their fonts - are read from Canva's section at runtime:
 *
 *   quote         a block starting with a quote mark, with the "- NAME" after it
 *   event title   the biggest text
 *   date line     the short line just above a title
 *   story         every block between one title and the next date line
 *
 * Each carousel opens with the event's own photo in Canva, followed by the
 * extra photos from the repo (story-photos.generated.ts, built from
 * source-images/our-story/<event>/ by scripts/story-photos.mjs), keyed by the
 * title.
 *
 * If the section cannot be read, nothing is mounted and Canva's stays.
 */
import { MOBILE } from "./player.ts";
import { STORY_PHOTOS } from "./story-photos.generated.ts";

/** A prefix, so `/our-story-2` matches too. */
const ROUTE_PREFIX = "/our-story";

const chevron = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;

/**
 * Sized in em from a root font-size the script sets: 16px divided by Canva's
 * page scale (it shrinks the page with a transform on narrow phones). Never
 * rem - Canva sets `html { font-size: 10px }`.
 *
 * `heroSelector` picks out Canva's opening section on this route, by its id
 * when the page data names it (see findSections), so the rule can never touch
 * the page being faded out during a page change.
 */
const styles = (heroSelector: string) => `
  #sj-story {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    padding: 2.25em 1.25em 3em;
    background-color: #f8f4f0;
    background-position: center top;
    background-size: cover;
    color: #5c4f53;
    -webkit-font-smoothing: antialiased;
  }
  #sj-story * { box-sizing: border-box; }
  #sj-story .sj-story-inner { max-width: 68em; margin: 0 auto; }

  /* The story cards: minimal, with a touch of the site's lavender - a
     near-white fill, a hairline edge, a soft shadow. */
  #sj-story .sj-card {
    border: 1px solid rgba(164, 127, 196, 0.2);
    border-radius: 2.1em;
    background: rgba(251, 249, 253, 0.95);
    box-shadow: 0 1em 2.6em rgba(110, 80, 140, 0.07);
  }

  /* ---------- the quotes ---------- */
  /* Open, straight on the paper: two centred columns, the quote in italic and
     a small, widely spaced name under it. */
  #sj-story .sj-quotes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2em 4.5em;
    max-width: 58em;
    margin: 0 auto 3.5em;
    padding: 0 1em 0.5em;
  }
  #sj-story .sj-quote { margin: 0; }
  #sj-story .sj-quote blockquote {
    margin: 0 0 1.1em;
    font-size: 1.55em;
    font-style: italic;
    line-height: 1.3;
    color: #2f2629;
  }
  #sj-story .sj-quote figcaption {
    font-size: 0.8em;
    letter-spacing: 0.3em;
  }

  /* ---------- the cards ---------- */
  #sj-story .sj-card {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    margin: 0 auto 3em;
    overflow: hidden;
  }
  #sj-story .sj-card--flip { grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr); }
  #sj-story .sj-card--flip .sj-card-media { order: 2; }
  #sj-story .sj-card--text { grid-template-columns: 1fr; }

  #sj-story .sj-card-media { padding: 1.1em; }
  #sj-story .sj-card-photos {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: 1.5em;
    background: #eee7f5;
    touch-action: pan-y;
  }
  #sj-story .sj-card-photos img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 700ms ease;
  }
  #sj-story .sj-card-photos img.is-on { opacity: 1; }

  #sj-story .sj-card-arrow {
    position: absolute;
    z-index: 2;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5em;
    height: 2.5em;
    margin: -1.25em 0 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.82);
    color: #8a6aa8;
    box-shadow: 0 0.2em 0.7em rgba(60, 40, 80, 0.16);
    cursor: pointer;
    transition: background-color 180ms ease, transform 180ms ease;
  }
  #sj-story .sj-card-arrow:hover { background: #fff; }
  #sj-story .sj-card-arrow:active { transform: scale(0.94); }
  #sj-story .sj-card-arrow svg { width: 1.15em; height: 1.15em; }
  #sj-story .sj-card-prev { left: 0.75em; }
  #sj-story .sj-card-next { right: 0.75em; }
  #sj-story .sj-card-dots {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    bottom: 0.7em;
    display: flex;
    justify-content: center;
    gap: 0.15em;
  }
  #sj-story .sj-card-dots button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.4em;
    height: 1.4em;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  #sj-story .sj-card-dots button::before {
    content: "";
    width: 0.45em;
    height: 0.45em;
    border-radius: 0.3em;
    background: rgba(255, 255, 255, 0.65);
    box-shadow: 0 0 0.3em rgba(0, 0, 0, 0.2);
    transition: width 300ms ease, background-color 300ms ease;
  }
  #sj-story .sj-card-dots button[aria-current]::before { width: 1.3em; background: #fff; }
  #sj-story button:focus-visible { outline: 2px solid #a47fc4; outline-offset: 2px; }

  #sj-story .sj-card-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2.6em 3.2em 2.8em;
  }
  #sj-story .sj-card--flip .sj-card-body { padding: 2.6em 2.4em 2.8em 3.6em; }
  #sj-story .sj-card-date {
    margin: 0 0 0.35em;
    font-size: 1.15em;
    font-style: italic;
    line-height: 1.4;
  }
  #sj-story .sj-card-title {
    margin: 0 0 0.6em;
    font-size: 2.35em;
    font-weight: 400;
    line-height: 1.2;
    letter-spacing: 0.08em;
    color: #3a3034;
    text-wrap: balance;
  }
  #sj-story .sj-card-body p.sj-card-text {
    margin: 0 0 0.9em;
    font-size: 1.12em;
    line-height: 1.85;
    color: #5c4f53;
  }
  #sj-story .sj-card-body p.sj-card-text:last-child { margin-bottom: 0; }

  #sj-story .sj-outro { margin: 3.5em auto 1em; }
  #sj-story .sj-outro-rule { height: 1px; margin-bottom: 2.6em; background: rgba(60, 48, 52, 0.16); }
  #sj-story .sj-outro-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2em;
  }
  /* The couple's monogram (the same file as the RSVP card's), used as a mask
     so it takes the colour of the closing text. */
  #sj-story .sj-outro-mark {
    flex: none;
    width: 4.6em;
    height: 5.65em;
    -webkit-mask: url("/_wedding/logo-mark.png") center / contain no-repeat;
    mask: url("/_wedding/logo-mark.png") center / contain no-repeat;
  }
  #sj-story .sj-outro-text p { margin: 0 0 0.3em; line-height: 1.35; text-align: left; }
  #sj-story .sj-outro-text p:last-child { margin-bottom: 0; }
  @media (max-width: 600px) {
    #sj-story .sj-outro-row { flex-direction: column; gap: 1.4em; }
    #sj-story .sj-outro-text p { text-align: center; }
  }

  #sj-story .sj-story-ornament { display: block; width: 5em; height: auto; margin: 0.5em auto 0; }

  /* Each card rises in as it scrolls into view, as Canva's own elements did. */
  #sj-story .sj-card.sj-reveal { opacity: 0; transform: translateY(1.6em); }
  #sj-story .sj-card.sj-reveal.is-in {
    opacity: 1;
    transform: none;
    transition: opacity 800ms ease, transform 900ms cubic-bezier(0.22, 0.68, 0.24, 1);
  }

  /* ---------- phones and small tablets: one column ---------- */
  @media (max-width: 820px) {
    #sj-story { padding: 1.75em 1em 2em; }
    #sj-story .sj-quotes { grid-template-columns: 1fr; gap: 2.2em; margin-bottom: 2.5em; padding: 0 0.5em; }
    #sj-story .sj-quote blockquote { font-size: 1.4em; margin-bottom: 0.9em; }
    #sj-story .sj-quote figcaption { font-size: 0.75em; }
    #sj-story .sj-card,
    #sj-story .sj-card--flip {
      grid-template-columns: 1fr;
      margin-bottom: 2em;
      border-radius: 1.6em;
    }
    #sj-story .sj-card--flip .sj-card-media { order: 0; }
    #sj-story .sj-card-media { padding: 0.75em 0.75em 0; }
    #sj-story .sj-card-photos { border-radius: 1.15em; }
    #sj-story .sj-card-body,
    #sj-story .sj-card--flip .sj-card-body { padding: 1.5em 1.4em 1.75em; }
    #sj-story .sj-card-title { font-size: 1.85em; }
    #sj-story .sj-card-body p.sj-card-text { font-size: 1.05em; line-height: 1.75; }
  }
  @media ${MOBILE} {
    /* Touch: the arrows stay, a little smaller; swipe does most of the work. */
    #sj-story .sj-card-arrow { width: 2.2em; height: 2.2em; margin-top: -1.1em; }
  }

  /* ---------- the full-screen opening ---------- */

  /* From the first moment on this route, Canva's opening section is held
     invisible at full-screen height, so everything below is already where it
     will end up: swapping in ours then moves nothing. (Stretching Canva's
     section after it drew is what made the old hero jump.) */
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
  /* Keeps white text legible: darker at the top for the nav and at the
     bottom for the title. */
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
    width: min(92%, 60em);
    transform: translateX(-50%);
    text-align: center;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.3);
  }
  /* Each line keeps its size from Canva, scaled down on narrow screens. */
  #sj-shero .sj-shero-copy p {
    margin: 0 0 0.35em;
    line-height: 1.15;
    text-wrap: balance;
    font-size: max(0.8em, calc(var(--sj-size) * var(--sj-scale, 1)));
  }
  #sj-shero .sj-shero-copy p:last-child { margin-bottom: 0; }
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
  .sj-rise { animation: sj-story-rise 1400ms cubic-bezier(0.22, 0.68, 0.24, 1) both; }
  @keyframes sj-story-rise {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    #sj-story .sj-card-photos img { transition: opacity 300ms ease; }
    #sj-story .sj-card.sj-reveal { transform: none; }
    /* A plain fade: no movement. */
    .sj-rise { animation-name: sj-story-fade; }
    @keyframes sj-story-fade { from { opacity: 0; } to { opacity: 1; } }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const script = (
  photos: Record<string, string[]>,
  heroImg: string | null,
  pages: Record<string, string>,
  sections: Record<string, string[]>,
) => `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var PHOTOS = ${JSON.stringify(photos)};
  var HERO_IMG = ${JSON.stringify(heroImg)};
  var PAGES = ${JSON.stringify(pages)};
  var SECTIONS = ${JSON.stringify(sections)};
  var ICON_PREV = ${JSON.stringify(chevron("M15 5 8 12l7 7"))};
  var ICON_NEXT = ${JSON.stringify(chevron("M9 5l7 7-7 7"))};
  var FALLBACK_FONT = ${JSON.stringify('Georgia, "Times New Roman", serif')};

  var root = null;     // our section
  var canva = null;    // Canva's story section, hidden while ours is up
  var content = null;  // what was read from it
  var observer = null; // reveals cards as they scroll into view
  var firstRead = 0;   // when the text first read, while waiting for images
  var IMAGE_WAIT = 6000;

  function onRoute() {
    return location.pathname.indexOf(ROUTE) === 0;
  }

  function keyOf(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function clean(text) {
    return text.replace(/\\s+/g, " ").trim();
  }

  /* ---------- reading Canva's section ---------- */

  function look(el) {
    var span = el.querySelector("span") || el;
    var cs = getComputedStyle(span);
    return { font: cs.fontFamily, color: cs.color, upper: cs.textTransform === "uppercase", italic: cs.fontStyle === "italic", size: parseFloat(cs.fontSize), spacing: parseFloat(cs.letterSpacing) || 0 };
  }

  /**
   * The quotes, events and photos in a section, or null if it is not the
   * story section or Canva has not finished drawing it (it lays text out in
   * stages, first unstyled, in one size).
   */
  function read(section) {
    var sr = section.getBoundingClientRect();
    if (!sr.width) return null;
    var blocks = [];
    var els = section.querySelectorAll("p, h1, h2, h3");
    for (var i = 0; i < els.length; i++) {
      var text = clean(els[i].innerText || els[i].textContent || "");
      var r = els[i].getBoundingClientRect();
      if (!text || !r.width) continue;
      var l = look(els[i]);
      blocks.push({ text: text, top: r.top, left: r.left, mid: r.top + r.height / 2, size: l.size, look: l });
    }
    blocks.sort(function (a, b) { return Math.abs(a.top - b.top) < 4 ? a.left - b.left : a.top - b.top; });

    var quotes = [], names = [], rest = [];
    for (var b = 0; b < blocks.length; b++) {
      if (/^[\\u201c\\u201d"\\u2018']/.test(blocks[b].text)) quotes.push(blocks[b]);
      else if (/^[\\u2014\\u2013-]\\s/.test(blocks[b].text)) names.push(blocks[b]);
      else rest.push(blocks[b]);
    }
    if (rest.length < 2) return null;

    var biggest = 0, smallest = Infinity;
    for (var s = 0; s < rest.length; s++) {
      biggest = Math.max(biggest, rest[s].size);
      smallest = Math.min(smallest, rest[s].size);
    }
    /* Not styled yet, or not a story section: titles must stand out. */
    if (biggest < smallest * 1.4) return null;
    var titles = [];
    for (var t = 0; t < rest.length; t++) if (rest[t].size >= biggest * 0.9) titles.push(t);
    if (!titles.length) return null;

    /* A short line just above a title is its date line. */
    function isDate(i) {
      return i >= 0 && titles.indexOf(i) === -1 && rest[i].text.length <= 80;
    }
    function sameStyle(a, b) {
      return a.look.font === b.look.font && a.look.upper === b.look.upper && Math.abs(a.size - b.size) < 1;
    }
    var events = [], outro = [];
    for (var e = 0; e < titles.length; e++) {
      var at = titles[e];
      var next = e + 1 < titles.length ? titles[e + 1] : rest.length;
      var stop = e + 1 < titles.length && isDate(next - 1) && next - 1 > at ? next - 1 : next;
      var body = [], length = 0;
      for (var k = at + 1; k < stop; k++) {
        /* The story ends where the text style changes: after the last event,
           that is the closing message (it was swallowed into THE QUESTION
           once the couple added one). */
        if (body.length && !sameStyle(body[0], rest[k])) {
          if (e === titles.length - 1) outro = rest.slice(k);
          break;
        }
        body.push(rest[k]);
        length += rest[k].text.length;
      }
      /* A story has a few sentences; a heading with a tagline is not one. */
      if (length < 80) return null;
      var dateIdx = at - 1;
      var hasDate = isDate(dateIdx) && (e === 0 || dateIdx > titles[e - 1]);
      events.push({ title: rest[at], date: hasDate ? rest[dateIdx] : null, body: body, photo: null });
    }

    /* Canva's own photos, each given to the event whose title is nearest -
       used only for events without photos in the repo. Full-width images are
       the background; small ones are ornaments. */
    var background = null, ornament = null;
    var imgs = section.getElementsByTagName("img");
    for (var m = 0; m < imgs.length; m++) {
      var src = imgs[m].currentSrc || imgs[m].src;
      if (!src) continue;
      var frame = imgs[m].parentElement;
      for (var f = 0; f < 5 && frame && getComputedStyle(frame).overflow !== "hidden"; f++) frame = frame.parentElement;
      var fr = (frame || imgs[m]).getBoundingClientRect();
      if (fr.width >= sr.width * 0.9) { background = background || src; continue; }
      if (fr.width < 150 || fr.height < 150) { if (fr.width > 30) ornament = src; continue; }
      var mid = fr.top + fr.height / 2, best = null, dist = Infinity;
      for (var n = 0; n < events.length; n++) {
        var d = Math.abs(events[n].title.mid - mid);
        if (d < dist) { dist = d; best = events[n]; }
      }
      if (best && !best.photo) best.photo = src;
    }

    /* Canva adds a section's images a few seconds after its text. Wait for
       them - the background, and every event's photo, which opens its
       carousel - but not forever: a design may simply not have them. */
    var complete = !!background;
    for (var w = 0; w < events.length; w++) {
      if (!events[w].photo) complete = false;
    }
    if (!complete) {
      if (!firstRead) firstRead = Date.now();
      if (Date.now() - firstRead < IMAGE_WAIT) return null;
    }

    var pairs = [];
    for (var q = 0; q < quotes.length; q++) pairs.push({ quote: quotes[q], name: names[q] || null });
    return { quotes: pairs, events: events, outro: outro, background: background, ornament: ornament };
  }

  /* ---------- building ours ---------- */

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function text(tag, cls, block, keepColor) {
    var node = el(tag, cls);
    node.textContent = block.text;
    node.style.fontFamily = block.look.font + ", " + FALLBACK_FONT;
    if (keepColor) node.style.color = block.look.color;
    if (block.look.upper) node.style.textTransform = "uppercase";
    return node;
  }

  function buildCard(event, index) {
    /* The event's photo in Canva first, then the extra ones from the repo. */
    var photos = (event.photo ? [event.photo] : []).concat(PHOTOS[keyOf(event.title.text)] || []);
    var card = el("article", "sj-card sj-reveal" + (index % 2 ? " sj-card--flip" : "") + (photos.length ? "" : " sj-card--text"));

    if (photos.length) {
      var media = el("div", "sj-card-media");
      var frame = el("div", "sj-card-photos");
      frame.setAttribute("aria-roledescription", "carousel");
      frame.setAttribute("aria-label", "Photos: " + event.title.text);
      for (var p = 0; p < photos.length; p++) {
        var img = el("img");
        img.alt = p === 0 ? event.title.text : "";
        img.decoding = "async";
        img.loading = "lazy";
        img.setAttribute("data-src", photos[p]);
        if (p === 0) { img.src = photos[p]; img.className = "is-on"; }
        frame.appendChild(img);
      }
      if (photos.length > 1) {
        var prev = el("button", "sj-card-arrow sj-card-prev", ICON_PREV);
        prev.type = "button";
        prev.setAttribute("aria-label", "Previous photo");
        prev.setAttribute("data-step", "-1");
        var nxt = el("button", "sj-card-arrow sj-card-next", ICON_NEXT);
        nxt.type = "button";
        nxt.setAttribute("aria-label", "Next photo");
        nxt.setAttribute("data-step", "1");
        frame.appendChild(prev);
        frame.appendChild(nxt);
        var dots = el("div", "sj-card-dots");
        for (var d = 0; d < photos.length; d++) {
          var dot = el("button");
          dot.type = "button";
          dot.setAttribute("aria-label", "Photo " + (d + 1) + " of " + photos.length);
          dot.setAttribute("data-go", String(d));
          if (d === 0) dot.setAttribute("aria-current", "true");
          dots.appendChild(dot);
        }
        frame.appendChild(dots);
        frame.addEventListener("touchstart", onTouchStart, { passive: true });
        frame.addEventListener("touchend", onTouchEnd, { passive: true });
      }
      media.appendChild(frame);
      card.appendChild(media);
    }

    var body = el("div", "sj-card-body");
    if (event.date) body.appendChild(text("p", "sj-card-date", event.date, true));
    body.appendChild(text("h2", "sj-card-title", event.title, false));
    for (var b = 0; b < event.body.length; b++) body.appendChild(text("p", "sj-card-text", event.body[b], false));
    card.appendChild(body);
    return card;
  }

  function build() {
    var section = el("section");
    section.id = "sj-story";
    section.setAttribute("aria-label", "Our story");
    if (content.background) section.style.backgroundImage = 'url("' + content.background + '")';
    var inner = el("div", "sj-story-inner");

    if (content.quotes.length) {
      var quotes = el("div", "sj-quotes");
      for (var q = 0; q < content.quotes.length; q++) {
        var fig = el("figure", "sj-quote");
        fig.appendChild(text("blockquote", null, content.quotes[q].quote, false));
        if (content.quotes[q].name) fig.appendChild(text("figcaption", null, content.quotes[q].name, true));
        quotes.appendChild(fig);
      }
      inner.appendChild(quotes);
    }
    for (var e = 0; e < content.events.length; e++) inner.appendChild(buildCard(content.events[e], e));
    /* The closing message after the stories, laid out as in the Canva
       design: a hairline across, then the couple's monogram with the lines
       beside it. The text is Canva's own; the line and monogram are not text,
       so they are drawn here. Sized against itself, not the story text (in
       Canva it is much smaller, which came out at 8px here): its biggest line
       a little larger than the story text, the rest in proportion. */
    if (content.outro.length) {
      var outro = el("div", "sj-outro");
      outro.appendChild(el("div", "sj-outro-rule"));
      var row = el("div", "sj-outro-row");
      var mark = el("span", "sj-outro-mark");
      mark.setAttribute("aria-hidden", "true");
      mark.style.backgroundColor = content.outro[0].look.color;
      row.appendChild(mark);
      var lines = el("div", "sj-outro-text");
      var largest = 0;
      for (var z = 0; z < content.outro.length; z++) largest = Math.max(largest, content.outro[z].size);
      for (var o = 0; o < content.outro.length; o++) {
        var block = content.outro[o];
        var line = text("p", null, block, true);
        line.style.fontSize = Math.max(0.85, 1.2 * block.size / largest).toFixed(3) + "em";
        if (block.look.spacing) line.style.letterSpacing = (block.look.spacing / block.size).toFixed(3) + "em";
        if (block.look.italic) line.style.fontStyle = "italic";
        lines.appendChild(line);
      }
      row.appendChild(lines);
      outro.appendChild(row);
      inner.appendChild(outro);
    }
    /* Canva's lone monogram at the bottom - only when the closing block,
       which carries the monogram itself, is not there. */
    if (content.ornament && !content.outro.length) {
      var orn = el("img", "sj-story-ornament");
      orn.alt = "";
      orn.src = content.ornament;
      inner.appendChild(orn);
    }
    section.appendChild(inner);
    return section;
  }

  /* ---------- the carousels ---------- */

  function show(frame, index) {
    var imgs = frame.getElementsByTagName("img");
    var count = imgs.length;
    index = (index + count) % count;
    for (var i = 0; i < count; i++) {
      /* Load on demand: this photo and the one after it. */
      if (i === index || i === (index + 1) % count) {
        if (!imgs[i].getAttribute("src")) imgs[i].src = imgs[i].getAttribute("data-src");
      }
      imgs[i].classList.toggle("is-on", i === index);
    }
    var dots = frame.querySelectorAll(".sj-card-dots button");
    for (var d = 0; d < dots.length; d++) {
      if (d === index) dots[d].setAttribute("aria-current", "true");
      else dots[d].removeAttribute("aria-current");
    }
    frame.setAttribute("data-index", String(index));
  }

  function current(frame) {
    return Number(frame.getAttribute("data-index") || 0);
  }

  var touch = null;
  function onTouchStart(e) {
    touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }
  function onTouchEnd(e) {
    if (!touch || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touch.x;
    var dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(this, current(this) + (dx < 0 ? 1 : -1));
  }

  /* By position, not event.target: Canva swaps the element under the pointer
     between pointerdown and mouseup, so the click can land on <body>. */
  function buttonAt(x, y) {
    if (!root || !root.isConnected) return null;
    var buttons = root.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      var r = buttons[i].getBoundingClientRect();
      if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return buttons[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    if (!onRoute() || !root) return;
    /* The phone menu and music button float above the page; theirs. */
    var over = e.detail !== 0 && document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest && over.closest("#sj-menu, #bgm-toggle")) return;
    var hit = buttonAt(e.clientX, e.clientY);
    if (!hit && e.detail === 0 && root.contains(e.target)) hit = e.target.closest("button");
    if (!hit) return;
    var frame = hit.closest(".sj-card-photos");
    if (!frame) return;
    e.preventDefault();
    e.stopPropagation();
    if (hit.hasAttribute("data-step")) show(frame, current(frame) + Number(hit.getAttribute("data-step")));
    else if (hit.hasAttribute("data-go")) show(frame, Number(hit.getAttribute("data-go")));
  }, true);

  /* ---------- the full-screen opening ---------- */

  /*
   * Canva's opening section is replaced by one of ours, one screen tall: its
   * photo filling the screen, the nav, and its lines rising in. The CSS holds
   * Canva's section invisible at that same height from the first moment on
   * this route, so the swap moves nothing below it.
   */
  var shero = null;     // our opening section
  var heroSrc = null;   // Canva's, hidden behind ours
  var heroCopy = null;  // its nav and lines, read once per visit
  var heroCount = -1, heroSince = 0, heroFirst = 0, heroFailed = false;
  var HERO_GIVE_UP = 8000;

  /* Our own sections (#sj-story, #sj-shero, #sj-hero). By name: Canva gives
     its sections ids too (since 2026-10-04), so "has an id" means nothing. */
  function ours(section) {
    return (section.id || "").indexOf("sj-") === 0;
  }

  /* The page being shown, by its Canva section ids (null if unknown). */
  function pageSections() {
    return SECTIONS[location.pathname.replace(/^\\/+|\\/+$/g, "")] || null;
  }

  function canvaHero() {
    /* By id when Canva's page data lists it: during a page change the old
       page is still in the document - reading its first section put the
       main page's names on this one. Null until Canva has drawn this page. */
    var ids = pageSections();
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

  /* A line's words, with Canva's <br>s as spaces. Not innerText: the section
     is invisible while being read, and innerText then falls back to text
     without the breaks ("HOW IT ALLBEGAN"). */
  function textOf(node) {
    var copy = node.cloneNode(true);
    var breaks = copy.getElementsByTagName("br");
    while (breaks.length) breaks[0].parentNode.replaceChild(document.createTextNode(" "), breaks[0]);
    return clean(copy.textContent || "");
  }

  /* "#page-2" -> "/details", from Canva's page numbers; null if unknown. */
  function pathFor(href) {
    var m = /^#page-(\\d+)$/.exec(href || "");
    var slug = m ? PAGES[m[1]] : null;
    return slug == null ? null : "/" + slug;
  }

  /**
   * The nav (text level with one of Canva's page links) and the other lines,
   * each with its look, in reading order. Null until Canva has drawn the
   * text styled - it lays it out in stages, first in one size.
   */
  function readHero(section) {
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
      var words = textOf(ps[i]);
      var r = ps[i].getBoundingClientRect();
      if (!words || !r.width) continue;
      var item = { text: words, top: r.top, left: r.left, look: look(ps[i]) };
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
    if (lines.length < 2) return null;
    var big = 0, small = Infinity;
    for (var s = 0; s < lines.length; s++) {
      big = Math.max(big, lines[s].look.size);
      small = Math.min(small, lines[s].look.size);
    }
    if (big < small * 1.6) return null;
    lines.sort(function (a, b) { return a.top - b.top; });
    nav.sort(function (a, b) { return Math.abs(a.top - b.top) < 8 ? a.left - b.left : a.top - b.top; });
    return { nav: nav, lines: lines };
  }

  /* The photo: from Canva's page data (preloaded with the page), else the
     biggest image Canva has drawn in its section. */
  function heroImage(section) {
    if (HERO_IMG) return HERO_IMG;
    var best = null, area = 0;
    var imgs = section.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; i++) {
      var r = imgs[i].getBoundingClientRect();
      if (r.width * r.height > area && (imgs[i].currentSrc || imgs[i].src)) { area = r.width * r.height; best = imgs[i]; }
    }
    return best ? best.currentSrc || best.src : null;
  }

  function buildHero() {
    var s = el("section");
    s.id = "sj-shero";
    s.setAttribute("aria-label", "Our story");
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

  function fillHero() {
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
    var copy = el("div", "sj-shero-copy");
    for (var n = 0; n < heroCopy.lines.length; n++) {
      var src = heroCopy.lines[n];
      var line = el("p", "sj-rise");
      line.textContent = src.text;
      line.style.fontFamily = src.look.font + ", " + FALLBACK_FONT;
      line.style.setProperty("--sj-size", (src.look.size / 16).toFixed(3) + "em");
      if (src.look.upper) line.style.textTransform = "uppercase";
      if (src.look.italic) line.style.fontStyle = "italic";
      if (src.look.spacing) line.style.letterSpacing = (src.look.spacing / src.look.size).toFixed(3) + "em";
      line.style.animationDelay = 250 + n * 200 + "ms";
      copy.appendChild(line);
    }
    shero.appendChild(copy);
    /* The phone menu (menu.ts) reads its links from here: Canva's own nav is
       inside the hidden section. */
    var shared = [];
    for (var j = 0; j < heroCopy.nav.length; j++) {
      shared.push({ text: heroCopy.nav[j].text, href: heroCopy.nav[j].href, font: heroCopy.nav[j].look.font });
    }
    window.__sjHeroNav = shared;
  }

  function unmountHero() {
    if (shero && shero.parentNode) shero.parentNode.removeChild(shero);
    if (heroSrc) {
      heroSrc.classList.remove("sj-shero-reading");
      heroSrc.style.display = "";
    }
    shero = null;
    heroSrc = null;
    heroCopy = null;
    heroCount = -1;
    heroFirst = 0;
  }

  function syncHero() {
    if (heroFailed) return;
    var section = heroSrc && heroSrc.isConnected ? heroSrc : canvaHero();
    if (!section) return;
    if (section !== heroSrc) {
      if (heroSrc) { heroSrc.classList.remove("sj-shero-reading"); heroSrc.style.display = ""; }
      heroSrc = section;
    }
    if (!heroFirst) heroFirst = Date.now();
    if (!shero) shero = buildHero();
    if (shero.nextElementSibling !== heroSrc) heroSrc.parentNode.insertBefore(shero, heroSrc);

    if (!heroCopy) {
      /* Out of the flow (ours holds the place) but still laid out, so its
         text can be read. */
      heroSrc.classList.add("sj-shero-reading");
      if (!shero.querySelector(".sj-shero-img")) {
        var src = heroImage(heroSrc);
        if (src) addHeroImage(src);
      }
      var got = readHero(heroSrc);
      /* Canva draws the lines in stages: take them once the set has held
         still briefly, so nothing is missed. */
      if (got) {
        var count = got.nav.length * 100 + got.lines.length;
        if (count !== heroCount) { heroCount = count; heroSince = Date.now(); }
        if (Date.now() - heroSince < 150) { got = null; window.setTimeout(syncHero, 200); }
      }
      if (!got) {
        /* Never leave a blank screen: if Canva's section cannot be read,
           give it back. */
        if (Date.now() - heroFirst > HERO_GIVE_UP) {
          heroFailed = true;
          unmountHero();
          document.documentElement.classList.remove("sj-shero-route");
        }
        return;
      }
      heroCopy = got;
      fillHero();
    }
    heroSrc.classList.remove("sj-shero-reading");
    if (heroSrc.style.display !== "none") heroSrc.style.display = "none";
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

  function scrollerOf(node) {
    for (var p = node.parentElement; p && p !== document.body; p = p.parentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === "scroll" || oy === "auto") && p.clientHeight) return p;
    }
    return null;
  }

  /* Set at once, before Canva draws anything, so its section never shows. */
  document.documentElement.classList.toggle("sj-shero-route", onRoute());

  /* ---------- mounting ---------- */

  function reveal(section) {
    var cards = section.querySelectorAll(".sj-card");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.IntersectionObserver || reduce) {
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove("sj-reveal");
      return;
    }
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add("is-in");
          observer.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.12 });
    for (var c = 0; c < cards.length; c++) observer.observe(cards[c]);
  }

  /* 16px, divided by Canva's page scale, so text keeps its size wherever
     Canva shrinks the page. */
  function size() {
    var parent = root.parentElement;
    if (!parent || !parent.offsetWidth) return;
    var k = parent.getBoundingClientRect().width / parent.offsetWidth || 1;
    var font = (16 / k).toFixed(3) + "px";
    if (root.style.fontSize !== font) root.style.fontSize = font;
  }

  /**
   * Leaving the page. Nothing is restored while Canva fades the old page out
   * - un-hiding its sections there flashed the original design. Ours stay
   * until Canva removes that page, then go.
   */
  var leftBehind = [];
  function leaveBehind(node, anchor) {
    if (node && anchor && anchor.isConnected) leftBehind.push({ node: node, anchor: anchor });
    else if (node && node.parentNode) node.parentNode.removeChild(node);
  }
  /* Whether a node can be seen at all: in the document, laid out, and with
     nothing above it hidden or faded to nothing. */
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
  /* "force": the guest is back on that very page - hand Canva's section back
     at once so ours can be built on it again. */
  function settleLeftBehind(force) {
    for (var i = leftBehind.length - 1; i >= 0; i--) {
      var l = leftBehind[i];
      var gone = !l.anchor.isConnected;
      /* Still fading out, or still showing: leave it exactly as it is. */
      if (!gone && !force && onScreen(l.node)) continue;
      if (l.node.parentNode) l.node.parentNode.removeChild(l.node);
      /* Canva kept the old page, hidden: give it its own section back, unseen. */
      if (!gone) {
        l.anchor.classList.remove("sj-shero-reading");
        l.anchor.style.display = "";
      }
      leftBehind.splice(i, 1);
    }
  }

  /* Canva's story section: the first of its sections that reads as one. */
  function findStory() {
    if (canva && canva.isConnected) return canva;
    var ids = pageSections();
    if (ids && ids.length > 1) {
      for (var k = 1; k < ids.length; k++) {
        var candidate = document.getElementById(ids[k]);
        if (candidate && read(candidate)) return candidate;
      }
      return null;
    }
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      if (ours(sections[i])) continue;
      var parent = sections[i].parentElement;
      if (!parent || parent.getElementsByTagName("section").length < 2) continue;
      /* Never Canva's first section: that is its hero, with the nav. */
      if (sections[i] === canvaHero()) continue;
      if (read(sections[i])) return sections[i];
    }
    return null;
  }

  /**
   * Canva re-renders and routes client-side, so this runs often and assumes
   * nothing survived: it re-reads a replaced section, re-inserts a detached
   * one, and takes everything down off the route.
   */
  function sync() {
    if (!document.body) return;
    var here = onRoute();
    /* Back on a page whose sections we left hidden: hand them back first. */
    var mine = false;
    for (var lb = 0; lb < leftBehind.length; lb++) {
      if (here && (leftBehind[lb].anchor === canvaHero() || (pageSections() || []).indexOf(leftBehind[lb].anchor.id) !== -1)) mine = true;
    }
    settleLeftBehind(mine);
    document.documentElement.classList.toggle("sj-shero-route", here && !heroFailed);
    if (!here) {
      heroFailed = false;
      if (shero || heroSrc) {
        leaveBehind(shero, heroSrc);
        shero = null;
        heroSrc = null;
        heroCopy = null;
        heroCount = -1;
        heroFirst = 0;
      }
      if (root || canva) {
        if (observer) observer.disconnect();
        leaveBehind(root, canva);
        root = null;
        canva = null;
        firstRead = 0;
      }
      return;
    }
    syncHero();

    var section = findStory();
    if (!section) return;
    if (section !== canva) {
      /* New (first visit, or Canva re-rendered): read it while visible. */
      var got = read(section);
      if (!got) return;
      if (canva) canva.style.display = "";
      if (root && root.parentNode) root.parentNode.removeChild(root);
      content = got;
      canva = section;
      root = build();
      section.parentNode.insertBefore(root, section);
      reveal(root);
    }
    if (root.nextElementSibling !== canva) canva.parentNode.insertBefore(root, canva);
    if (canva.style.display !== "none") canva.style.display = "none";
    size();
  }

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
  window.addEventListener("resize", function () { if (root) size(); });
  window.setInterval(sync, 800);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

/**
 * The Our Story page's opening photo, read from Canva's page data on every
 * request (the couple swaps it in Canva; its hash changes each publish):
 *
 *   page index    {"K":"PB1h8M...","L":"our-story", ...}
 *   page content  "a":"PB1h8M..." ... its first image fill,
 *                 "a":{"B":{"A":{"A?":"d","A":"<upload>","B":1},"I":{"A?":"d","A":"<edited>"...
 *                 ("I" is the edited copy Canva actually shows)
 *   media table   one entry per size; the widest is used
 *
 * Null if it cannot be found: the script then takes the photo Canva draws.
 */
export function findStoryHero(html: string): string | null {
  try {
    const pages = [...html.matchAll(/"K":"([A-Za-z0-9_-]+)","L":"([a-z0-9-]*)"/g)];
    const slug = ROUTE_PREFIX.slice(1);
    const page = pages.find((m) => m[2] === slug) ?? pages.find((m) => m[2].startsWith(slug));
    if (!page) return null;
    const start = html.indexOf(`"a":"${page[1]}"`);
    if (start === -1) return null;
    const ref = /"a":\{"B":\{"A":\{"A\?":"d","A":"([A-Za-z0-9_-]+)","B":\d+\}(?:,"I":\{"A\?":"d","A":"([A-Za-z0-9_-]+)")?/
      .exec(html.slice(start, start + 20000));
    if (!ref) return null;
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
    return best ? best.url : null;
  } catch (error) {
    console.warn("[story] could not find the opening photo:", error);
    return null;
  }
}

/** Starts the opening photo downloading with the HTML on a direct visit. */
export function renderStoryPreload(heroImg: string | null, pathname: string): string {
  if (!heroImg || !pathname.startsWith(ROUTE_PREFIX)) return "";
  return `<link rel="preload" as="image" href="${heroImg}" fetchpriority="high">`;
}

export function renderStory(
  nonce: string | null,
  heroImg: string | null,
  pages: Record<string, string>,
  sections: Record<string, string[]>,
): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  // Canva's opening section on every page this script handles, by id; the
  // old "first section" rule only if the page data names none.
  const slug = ROUTE_PREFIX.slice(1);
  const heroIds = Object.keys(sections)
    .filter((s) => s.startsWith(slug))
    .map((s) => sections[s][0])
    .filter((id) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id));
  const heroSelector = heroIds.length
    ? heroIds.map((id) => `html.sj-shero-route #${id}`).join(", ")
    : `html.sj-shero-route section:not([id^="sj-"]):first-of-type`;
  return `\n<style${nonceAttr}>${styles(heroSelector)}</style>\n<script${nonceAttr}>${script(STORY_PHOTOS, heroImg, pages, sections)}</script>\n`;
}
