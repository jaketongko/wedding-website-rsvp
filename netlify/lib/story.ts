/**
 * The Our Story page's story section, re-set as rounded blush-pink cards: a
 * photo carousel on one side (arrows, dots, swipe) and the event's date,
 * title and story on the other, alternating sides on desktop and stacked on
 * a phone. The two quotes above the stories are carried over.
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
 * Photos come from the repo (story-photos.generated.ts, built from
 * source-images/our-story/<event>/ by scripts/story-photos.mjs), keyed by the
 * title. An event with no folder keeps the one photo it has in Canva.
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

/** The four-point sparkle above each title. */
const SPARKLE =
  `<svg class="sj-card-spark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
  `<path d="M12 1.5c.5 5.4 3.8 9.4 10.5 10.5C15.8 13.1 12.5 17 12 22.5 11.5 17 8.2 13.1 1.5 12 8.2 10.9 11.5 6.9 12 1.5z"/></svg>`;

/**
 * Sized in em from a root font-size the script sets: 16px divided by Canva's
 * page scale (it shrinks the page with a transform on narrow phones). Never
 * rem - Canva sets `html { font-size: 10px }`.
 */
const STYLES = `
  #sj-story {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    padding: 3.5em 1.25em 3em;
    background-color: #f8f4f0;
    background-position: center top;
    background-size: cover;
    color: #5c4f53;
    -webkit-font-smoothing: antialiased;
  }
  #sj-story * { box-sizing: border-box; }
  #sj-story .sj-story-inner { max-width: 68em; margin: 0 auto; }

  /* ---------- the quotes ---------- */
  #sj-story .sj-quotes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2em 3.5em;
    max-width: 62em;
    margin: 0 auto 3.5em;
  }
  #sj-story .sj-quote { margin: 0; }
  #sj-story .sj-quote blockquote {
    margin: 0 0 0.6em;
    font-size: 1.75em;
    font-style: italic;
    line-height: 1.25;
    color: #2f2629;
  }
  #sj-story .sj-quote figcaption {
    font-size: 1.05em;
    letter-spacing: 0.3em;
  }

  /* ---------- the cards ---------- */
  #sj-story .sj-card {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    margin: 0 auto 3em;
    overflow: hidden;
    border: 1px solid rgba(233, 176, 190, 0.38);
    border-radius: 2.1em;
    background: linear-gradient(90deg, #fdebee 0%, #fff6f5 44%, #fffbfa 100%);
    box-shadow: 0 1.5em 3.6em rgba(201, 134, 150, 0.13), 0 0.15em 0.4em rgba(201, 134, 150, 0.06);
  }
  #sj-story .sj-card--flip {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    background: linear-gradient(270deg, #fdebee 0%, #fff6f5 44%, #fffbfa 100%);
  }
  #sj-story .sj-card--flip .sj-card-media { order: 2; }
  #sj-story .sj-card--text { grid-template-columns: 1fr; }

  #sj-story .sj-card-media { padding: 1.1em; }
  #sj-story .sj-card-photos {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: 1.5em;
    background: #f3dfe3;
    transition: transform 420ms cubic-bezier(0.22, 0.68, 0.24, 1), box-shadow 420ms ease;
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
  /* A photo lifts a little under a mouse. */
  @media (hover: hover) and (pointer: fine) {
    #sj-story .sj-card-media:hover .sj-card-photos {
      transform: translateY(-0.3em) scale(1.015);
      box-shadow: 0 1.2em 2.2em rgba(150, 90, 105, 0.22);
    }
  }

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
    color: #b56a80;
    box-shadow: 0 0.2em 0.7em rgba(80, 40, 50, 0.18);
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
  #sj-story button:focus-visible { outline: 2px solid #d48a9e; outline-offset: 2px; }

  #sj-story .sj-card-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2.6em 3.2em 2.8em;
  }
  #sj-story .sj-card--flip .sj-card-body { padding: 2.6em 2.4em 2.8em 3.6em; }
  #sj-story .sj-card-spark { width: 1.6em; height: 1.6em; margin-bottom: 1em; fill: #eba3b6; }
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
    #sj-story { padding: 2.5em 1em 2em; }
    #sj-story .sj-quotes { grid-template-columns: 1fr; gap: 1.75em; margin-bottom: 2.5em; }
    #sj-story .sj-quote blockquote { font-size: 1.45em; }
    #sj-story .sj-quote figcaption { font-size: 0.95em; }
    #sj-story .sj-card,
    #sj-story .sj-card--flip {
      grid-template-columns: 1fr;
      margin-bottom: 2em;
      border-radius: 1.6em;
      background: linear-gradient(180deg, #fdebee 0%, #fff6f5 45%, #fffbfa 100%);
    }
    #sj-story .sj-card--flip .sj-card-media { order: 0; }
    #sj-story .sj-card-media { padding: 0.75em 0.75em 0; }
    #sj-story .sj-card-photos { border-radius: 1.15em; }
    #sj-story .sj-card-body,
    #sj-story .sj-card--flip .sj-card-body { padding: 1.5em 1.4em 1.75em; }
    #sj-story .sj-card-spark { width: 1.3em; height: 1.3em; margin-bottom: 0.7em; }
    #sj-story .sj-card-title { font-size: 1.85em; }
    #sj-story .sj-card-body p.sj-card-text { font-size: 1.05em; line-height: 1.75; }
  }
  @media ${MOBILE} {
    /* Touch: the arrows stay, a little smaller; swipe does most of the work. */
    #sj-story .sj-card-arrow { width: 2.2em; height: 2.2em; margin-top: -1.1em; }
  }

  @media (prefers-reduced-motion: reduce) {
    #sj-story .sj-card-photos, #sj-story .sj-card-photos img { transition: opacity 300ms ease; }
    #sj-story .sj-card-media:hover .sj-card-photos { transform: none; }
    #sj-story .sj-card.sj-reveal { transform: none; }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const script = (photos: Record<string, string[]>) => `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var PHOTOS = ${JSON.stringify(photos)};
  var ICON_PREV = ${JSON.stringify(chevron("M15 5 8 12l7 7"))};
  var ICON_NEXT = ${JSON.stringify(chevron("M9 5l7 7-7 7"))};
  var SPARKLE = ${JSON.stringify(SPARKLE)};
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
    return { font: cs.fontFamily, color: cs.color, upper: cs.textTransform === "uppercase", italic: cs.fontStyle === "italic", size: parseFloat(cs.fontSize) };
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
    var events = [];
    for (var e = 0; e < titles.length; e++) {
      var at = titles[e];
      var next = e + 1 < titles.length ? titles[e + 1] : rest.length;
      var stop = e + 1 < titles.length && isDate(next - 1) && next - 1 > at ? next - 1 : next;
      var body = [], length = 0;
      for (var k = at + 1; k < stop; k++) { body.push(rest[k]); length += rest[k].text.length; }
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
       them - the background, and a photo for every event without photos in
       the repo - but not forever: a design may simply not have them. */
    var complete = !!background;
    for (var w = 0; w < events.length; w++) {
      if (!events[w].photo && !PHOTOS[keyOf(events[w].title.text)]) complete = false;
    }
    if (!complete) {
      if (!firstRead) firstRead = Date.now();
      if (Date.now() - firstRead < IMAGE_WAIT) return null;
    }

    var pairs = [];
    for (var q = 0; q < quotes.length; q++) pairs.push({ quote: quotes[q], name: names[q] || null });
    return { quotes: pairs, events: events, background: background, ornament: ornament };
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
    var photos = PHOTOS[keyOf(event.title.text)] || (event.photo ? [event.photo] : []);
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
    body.appendChild(el("span", null, SPARKLE).firstChild);
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
    if (content.ornament) {
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

  function unmount() {
    if (observer) observer.disconnect();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (canva) canva.style.display = "";
    root = null;
    canva = null;
    firstRead = 0;
  }

  /* Canva's story section: the first of its sections that reads as one. */
  function findStory() {
    if (canva && canva.isConnected) return canva;
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === "sj-story" || sections[i].id === "sj-hero") continue;
      var parent = sections[i].parentElement;
      if (!parent || parent.getElementsByTagName("section").length < 2) continue;
      /* Never the page's first section: that is its hero, with the nav. */
      if (parent.querySelector("section") === sections[i]) continue;
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
    if (!onRoute()) { if (root || canva) unmount(); return; }

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

export function renderStory(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${script(STORY_PHOTOS)}</script>\n`;
}
