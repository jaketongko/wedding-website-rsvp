/**
 * Turns the Gallery page's photo grid into a proper gallery: a hover treatment
 * on each tile, and a lightbox that opens the full photo with previous/next.
 *
 * How Canva builds a photo tile (measured on the live page, 2026-09-18):
 *
 *   div  <- crop frame, overflow:hidden, the box the guest actually sees
 *     div  <- position:relative wrapper, sized to the WHOLE photo
 *       img  <- position:absolute, pointer-events:none, the whole photo
 *
 * So the `img` is bigger than the tile and hangs outside it; the frame does the
 * cropping. That shapes two decisions:
 *
 *  - Hover lives on the frame, never the `img` (which takes no pointer events),
 *    and the zoom scales the `img` inside its frame - the classic gallery
 *    effect, and it cannot disturb the grid because the frame never moves.
 *    `transform-origin` is set per tile so the zoom pushes out from the middle
 *    of the visible crop rather than the middle of the hidden full photo.
 *  - The lightbox has nothing to fetch: `img.src` is already the full-size
 *    photo, so every image it shows is in cache before the first click.
 *
 * Injected on EVERY page and scoped to the route at runtime, like the rest of
 * the injected UI - Canva routes client-side, so arriving at /gallery from the
 * invitation fires no document load. Canva also re-renders <body> and detaches
 * our nodes, so tagging is idempotent and re-run from a MutationObserver.
 */
import { FONT, LAVENDER } from "./rsvp.ts";

/**
 * The gallery page's slug. A prefix, not an equality test: the page was
 * `/gallerystory` until it was renamed to `/gallery`, and matching the prefix
 * survives that kind of rename (and any `/gallery-2` the couple adds later).
 */
const ROUTE_PREFIX = "/gallery";

/** Above the petals (2147481000) and the music toggle (2147482000), below the
 * RSVP modal (2147483100), which lives on a different route anyway. */
const Z_INDEX = 2147483000;

/** Matches the RSVP card's accent, the one lavender the site is themed on. */
const ACCENT = "#9e6297";
const ACCENT_SOFT = LAVENDER.buds[2];

/** Magnifier-plus shown in the middle of a tile on hover: "this opens larger". */
const VIEW_ICON =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
  `stroke="#ffffff" stroke-width="1.25" stroke-linecap="round">` +
  `<circle cx="10.4" cy="10.4" r="6.4"/>` +
  `<path d="M10.4 7.7v5.4M7.7 10.4h5.4M15.1 15.1 19.6 19.6"/></svg>`;

/** encodeURIComponent, not a raw inline SVG: the icon contains `#` and `"`,
 * both of which end a CSS url() early. */
const VIEW_ICON_URL = `url("data:image/svg+xml,${encodeURIComponent(VIEW_ICON)}")`;

const chevron = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
  `<path d="${d}"/></svg>`;

const ICON_PREV = chevron("M15 5 8 12l7 7");
const ICON_NEXT = chevron("M9 5l7 7-7 7");
const ICON_CLOSE = chevron("M6 6l12 12M18 6 6 18");

/**
 * Sizes are in px, never rem: Canva sets `html { font-size: 10px }`, so rem
 * here would render at 62.5% of the intended size. See the README.
 */
const STYLES = `
  /* ---------- the tiles ---------------------------------------------- */

  .sj-gtile {
    /* Canva leaves the frame static; making it the containing block anchors
       ::after to the tile. It cannot shift the layout - the frame's children
       are positioned against the wrapper inside it, not against the frame. */
    position: relative;
    cursor: zoom-in;
  }
  .sj-gtile img {
    transform-origin: var(--sj-gx, 50%) var(--sj-gy, 50%);
    transition: transform 620ms cubic-bezier(0.22, 0.68, 0.24, 1);
  }
  .sj-gtile:hover img,
  .sj-gtile:focus-visible img {
    transform: scale(1.07);
  }
  /* Bottom shade, a lavender hairline and the magnifier, in one layer. */
  .sj-gtile::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 320ms ease;
    background:
      ${VIEW_ICON_URL} center / 34px 34px no-repeat,
      linear-gradient(180deg, rgba(43, 30, 45, 0) 38%, rgba(43, 30, 45, 0.52) 100%);
    box-shadow: inset 0 0 0 2px rgba(207, 163, 200, 0.85);
  }
  .sj-gtile:hover::after,
  .sj-gtile:focus-visible::after {
    opacity: 1;
  }
  .sj-gtile:focus { outline: none; }
  .sj-gtile:focus-visible { outline: 3px solid ${ACCENT_SOFT}; outline-offset: 2px; }

  /* ---------- the lightbox ------------------------------------------- */

  #sj-gbox {
    position: fixed;
    inset: 0;
    z-index: ${Z_INDEX};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 20px;
    font-family: ${FONT};
    color: #f4eef3;
    background: rgba(26, 19, 27, 0.9);
    -webkit-backdrop-filter: blur(7px);
    backdrop-filter: blur(7px);
    opacity: 0;
    transition: opacity 240ms ease;
    /* The page behind must not move while the viewer is open. pinch-zoom
       rather than none, so a guest can still pinch a photo to look closer;
       one-finger panning stays ours, for the swipe. */
    overscroll-behavior: contain;
    touch-action: pinch-zoom;
  }
  #sj-gbox.sj-gbox--open { opacity: 1; }
  #sj-gbox[hidden] { display: none; }
  #sj-gbox * { box-sizing: border-box; }

  #sj-gbox-img {
    display: block;
    max-width: min(92vw, 1400px);
    max-height: 80vh;
    border-radius: 10px;
    box-shadow: 0 26px 70px rgba(0, 0, 0, 0.55);
    /* Holds the frame while a photo decodes, so the layout does not jump. */
    background: rgba(255, 255, 255, 0.05);
  }
  #sj-gbox-img.sj-gbox--enter {
    animation: sj-gbox-in 380ms cubic-bezier(0.22, 0.68, 0.24, 1);
  }
  @keyframes sj-gbox-in {
    from { opacity: 0; transform: translateX(var(--sj-gslide, 0px)) scale(0.985); }
    to { opacity: 1; transform: none; }
  }

  /* Prev, counter and next share one row. On wide screens the two buttons are
     lifted out of the row and parked against the edges, so nothing sits on the
     photo; the counter stays centred underneath either way. */
  #sj-gbox-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  #sj-gbox-count {
    min-width: 72px;
    text-align: center;
    font-size: 15px;
    letter-spacing: 0.22em;
    color: rgba(244, 238, 243, 0.78);
  }
  #sj-gbox button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    padding: 0;
    color: inherit;
    font: inherit;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    cursor: pointer;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    transition: background 200ms ease, border-color 200ms ease, transform 200ms ease;
  }
  #sj-gbox button svg { width: 22px; height: 22px; }
  #sj-gbox button:hover {
    background: rgba(${hexToRgb(ACCENT)}, 0.85);
    border-color: ${ACCENT_SOFT};
  }
  #sj-gbox button:active { transform: scale(0.94); }
  #sj-gbox button:focus-visible { outline: 3px solid ${ACCENT_SOFT}; outline-offset: 3px; }
  #sj-gbox button[hidden] { display: none; }

  #sj-gbox-close { position: absolute; top: 18px; right: 18px; }

  @media (min-width: 700px) {
    #sj-gbox-prev, #sj-gbox-next {
      position: absolute;
      top: 50%;
      width: 52px;
      height: 52px;
      margin-top: -26px;
    }
    #sj-gbox-prev { left: max(18px, 2vw); }
    #sj-gbox-next { right: max(18px, 2vw); }
  }

  /* Phones: the buttons stay in the row under the photo, which leaves the
     photo itself untouched and puts both controls under the thumb. */
  @media (max-width: 699px) {
    #sj-gbox { gap: 14px; padding: 14px; }
    #sj-gbox-img { max-height: 70vh; max-width: 94vw; }
    #sj-gbox-close { top: 12px; right: 12px; width: 40px; height: 40px; }
  }

  @media (prefers-reduced-motion: reduce) {
    #sj-gbox, #sj-gbox-img, .sj-gtile img, .sj-gtile::after {
      transition: none;
      animation: none;
    }
    .sj-gtile:hover img, .sj-gtile:focus-visible img { transform: none; }
  }
`;

/**
 * ES5 on purpose, like the other injected scripts: it runs on whatever phone a
 * guest opens the invitation with, and there is no build step to transpile it.
 */
const SCRIPT = `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  /* Ignore rules, icons and Canva's text-rendered blobs. */
  var MIN_TILE = 100;
  /* A frame this wide AND this tall is the page's background artwork, not a
     photo tile. Both tests together: a full-width frame that is short is a
     banner, and a tall frame that is narrow is a portrait tile. */
  var BLEED_W = 0.9;
  var BLEED_H = 0.6;
  var POLL = 700;

  var photos = [];   // unique srcs, in reading order
  var tiles = [];    // { frame: Element, img: Element, photo: Number }
  var index = 0;
  var box = null, boxImg = null, boxCount = null;
  var btnPrev = null, btnNext = null, btnClose = null;
  var lastFocus = null;
  var hideTimer = 0;
  var touchX = 0, touchY = 0;
  var observer = null;
  var imageCount = -1;

  /* Phone grid: Canva stacks the couple's photo grid one per row on a phone,
     even though it is a Grid element. At least this many tiles sharing one
     left edge, with nothing beside them, is that stacked column. */
  var STACKED = 4;
  /* Belt and braces: never reflow a page this wide. Canva's phone layout is
     ~390px; its desktop layout is wider than any phone. */
  var NARROW = 700;
  var COLS = 2;
  var GUTTER = 16;   // matches the title divider's inset on a phone
  var GAP = 10;
  var reflowed = []; // { el, prop, before, value } - every style we changed

  function onRoute() {
    return location.pathname.indexOf(ROUTE) === 0;
  }

  function isOpen() {
    return box && !box.hidden;
  }

  /* ---------- finding the tiles -------------------------------------- */

  /**
   * The nearest ancestor that clips the photo - the box the guest sees. Canva
   * puts it two levels up today; the walk is bounded so a redesign that adds a
   * wrapper still works and one that removes the clip cannot run away.
   */
  function frameOf(img) {
    var el = img;
    for (var i = 0; i < 6 && el.parentElement; i++) {
      el = el.parentElement;
      var r = el.getBoundingClientRect();
      if (getComputedStyle(el).overflow !== "visible" && r.width >= 8 && r.height >= 8) return el;
    }
    return img.parentElement || img;
  }

  function scan() {
    var docWidth = document.documentElement.clientWidth || window.innerWidth;
    var docHeight = window.innerHeight;
    var imgs = document.images;
    var found = [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var src = img.currentSrc || img.src;
      /* Canva paints some text to a canvas and hands it over as a blob URL. */
      if (!src || src.indexOf("blob:") === 0 || src.indexOf("data:") === 0) continue;
      var frame = frameOf(img);
      var r = frame.getBoundingClientRect();
      if (r.width < MIN_TILE || r.height < MIN_TILE) continue;
      if (r.width >= docWidth * BLEED_W && r.height >= docHeight * BLEED_H) continue;
      found.push({ frame: frame, img: img, src: src, rect: r });
    }
    /* Reading order, so previous/next follows the grid rather than the DOM.
       The 24px band treats one row as one row despite sub-pixel tops. */
    found.sort(function (a, b) {
      if (Math.abs(a.rect.top - b.rect.top) > 24) return a.rect.top - b.rect.top;
      return a.rect.left - b.rect.left;
    });
    return found;
  }

  /**
   * The zoom should push out from the middle of the visible crop. The photo is
   * larger than its frame and off-centre inside it, so the origin is the frame
   * centre expressed in percentages of the photo.
   */
  function setOrigin(entry) {
    var ir = entry.img.getBoundingClientRect();
    var fr = entry.frame.getBoundingClientRect();
    if (!ir.width || !ir.height) return;
    var x = ((fr.left + fr.width / 2 - ir.left) / ir.width) * 100;
    var y = ((fr.top + fr.height / 2 - ir.top) / ir.height) * 100;
    entry.img.style.setProperty("--sj-gx", x.toFixed(2) + "%");
    entry.img.style.setProperty("--sj-gy", y.toFixed(2) + "%");
  }

  function tag() {
    var found = scan();
    /* Clear the previous set first, so a frame that is no longer a photo tile
       does not keep the hover styling and a stale label. */
    untag();
    if (!found.length) return;

    /* The couple's grid repeats the same photos, so previous/next walks the
       unique ones; every copy of a photo opens that one entry. */
    var seen = {};
    for (var i = 0; i < found.length; i++) {
      var entry = found[i];
      if (!Object.prototype.hasOwnProperty.call(seen, entry.src)) {
        seen[entry.src] = photos.length;
        photos.push(entry.src);
      }
      entry.photo = seen[entry.src];
      entry.frame.classList.add("sj-gtile");
      entry.frame.setAttribute("role", "button");
      entry.frame.setAttribute("tabindex", "0");
      setOrigin(entry);
      tiles.push(entry);
    }

    /* Labels in a second pass: the total is only known once every tile has
       been folded into the unique list. */
    for (var j = 0; j < tiles.length; j++) {
      tiles[j].frame.setAttribute(
        "aria-label",
        "Open photo " + (tiles[j].photo + 1) + " of " + photos.length
      );
    }
  }

  function untag() {
    for (var i = 0; i < tiles.length; i++) {
      var frame = tiles[i].frame;
      if (!frame.isConnected) continue;
      frame.classList.remove("sj-gtile");
      frame.removeAttribute("role");
      frame.removeAttribute("tabindex");
      frame.removeAttribute("aria-label");
    }
    tiles = [];
    photos = [];
  }

  /* ---------- two columns on phones ----------------------------------- */

  /**
   * How Canva builds the phone layout (measured on the live page, 2026-10-03):
   * one page container with an inline px height, and every element inside it
   * absolutely positioned. The photos are the slots of three Grid groups,
   * stacked into a single 251px column, with the divider, buttons and footer
   * placed below them.
   *
   * So the reflow is three moves, all in the page's own px:
   *  1. scale each photo slot down and translate it into a two-column grid,
   *  2. lift everything below the old column by the height saved,
   *  3. shrink the page (and anything sized to it) by that same amount, or
   *     the page would end in a long empty stretch.
   *
   * Every change goes through put(), so it can be undone exactly, and sync()
   * redoes the whole thing whenever Canva overwrites one of them.
   */
  function put(el, prop, value) {
    var record = { el: el, prop: prop, before: el.style.getPropertyValue(prop) };
    el.style.setProperty(prop, value);
    /* Read back, so the comparison in flowIntact sees the browser's spelling. */
    record.value = el.style.getPropertyValue(prop);
    reflowed.push(record);
  }

  function unflow() {
    for (var i = reflowed.length - 1; i >= 0; i--) {
      var r = reflowed[i];
      /* A value Canva has since rewritten is Canva's again; leave it alone. */
      if (r.el.isConnected && r.el.style.getPropertyValue(r.prop) === r.value) {
        r.el.style.setProperty(r.prop, r.before);
      }
    }
    reflowed = [];
  }

  function flowIntact() {
    for (var i = 0; i < reflowed.length; i++) {
      var r = reflowed[i];
      if (!r.el.isConnected || r.el.style.getPropertyValue(r.prop) !== r.value) return false;
    }
    return true;
  }

  function pxHeight(el) {
    var m = /^([0-9.]+)px$/.exec(el.style.height);
    return m ? parseFloat(m[1]) : NaN;
  }

  function reflow() {
    /* The stacked column: the largest set of tiles sharing a left edge. */
    var byLeft = {};
    var column = [];
    for (var i = 0; i < tiles.length; i++) {
      var key = Math.round(tiles[i].frame.getBoundingClientRect().left);
      (byLeft[key] = byLeft[key] || []).push(tiles[i]);
      if (byLeft[key].length > column.length) column = byLeft[key];
    }
    if (column.length < STACKED) return;

    var frames = column.map(function (t) { return t.frame; });

    /* On desktop, a column of the 4-across grid also shares a left edge; what
       sets the phone layout apart is that no other photo sits beside it. */
    var colTop = Infinity, colBottom = -Infinity;
    for (var e = 0; e < frames.length; e++) {
      var fr0 = frames[e].getBoundingClientRect();
      colTop = Math.min(colTop, fr0.top);
      colBottom = Math.max(colBottom, fr0.bottom);
    }
    for (var o = 0; o < tiles.length; o++) {
      if (column.indexOf(tiles[o]) !== -1) continue;
      var or = tiles[o].frame.getBoundingClientRect();
      if (or.bottom > colTop && or.top < colBottom) return;
    }
    function holdsTwo(el) {
      var n = 0;
      for (var j = 0; j < frames.length && n < 2; j++) if (el.contains(frames[j])) n++;
      return n > 1;
    }

    /* The page: the nearest ancestor holding every photo. */
    var page = frames[0].parentElement;
    while (page && !frames.every(function (f) { return page.contains(f); })) page = page.parentElement;
    if (!page || !page.offsetWidth || page.offsetWidth >= NARROW) return;

    var pr = page.getBoundingClientRect();
    var k = pr.width / page.offsetWidth;   // Canva's own page scale, if any
    function at(el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - pr.left) / k, y: (r.top - pr.top) / k, w: r.width / k, h: r.height / k };
    }

    /* Each photo's slot: the outermost ancestor that holds no other photo. */
    var items = [];
    for (var a = 0; a < frames.length; a++) {
      var slot = frames[a];
      while (slot.parentElement && slot.parentElement !== page && !holdsTwo(slot.parentElement)) {
        slot = slot.parentElement;
      }
      /* Only plain translations are understood; a scaled wrapper means Canva
         has changed how it builds this, and the stacked column is safer. */
      var parent = slot.parentElement;
      if (Math.abs(at(parent).w / parent.offsetWidth - 1) > 0.01) return;
      var f = at(frames[a]);
      var s = at(slot);
      items.push({ slot: slot, frame: f, off: { x: f.x - s.x, y: f.y - s.y } });
    }
    items.sort(function (p, q) { return p.frame.y - q.frame.y; });

    var top = items[0].frame.y;
    var bottom = 0;
    for (var b = 0; b < items.length; b++) bottom = Math.max(bottom, items[b].frame.y + items[b].frame.h);

    /* 1. The grid. The slot's untransformed box is measured with Canva's
       translate switched off, then one transform puts the photo in its cell. */
    var cell = (page.offsetWidth - 2 * GUTTER - (COLS - 1) * GAP) / COLS;
    var y = top;
    for (var row = 0; row * COLS < items.length; row++) {
      var rowHeight = 0;
      for (var c = 0; c < COLS; c++) {
        var item = items[row * COLS + c];
        if (!item) break;
        var scale = cell / item.frame.w;
        var canvaTransform = item.slot.style.transform;
        item.slot.style.transform = "none";
        var box = at(item.slot);
        item.slot.style.transform = canvaTransform;
        var tx = GUTTER + c * (cell + GAP) - item.off.x * scale - box.x;
        var ty = y - item.off.y * scale - box.y;
        put(item.slot, "transform-origin", "0 0");
        put(item.slot, "transform",
          "translate(" + tx.toFixed(2) + "px, " + ty.toFixed(2) + "px) scale(" + scale.toFixed(4) + ")");
        rowHeight = Math.max(rowHeight, item.frame.h * scale);
      }
      y += rowHeight + GAP;
    }
    var saved = bottom - (y - GAP);
    if (saved < 1) return;

    /* 2 and 3. The page's other children: lift what sat below the column,
       shorten what spanned it (the frame border drawn round the content). */
    var oldHeight = page.offsetHeight;
    for (var d = 0; d < page.children.length; d++) {
      var child = page.children[d];
      if (frames.some(function (fr) { return child.contains(fr); })) continue;
      var r = at(child);
      if (r.y >= bottom - 1) {
        put(child, "margin-top", (-saved).toFixed(2) + "px");
      } else if (r.y < top && r.y + r.h > bottom && !isNaN(pxHeight(child))) {
        put(child, "height", (pxHeight(child) - saved).toFixed(2) + "px");
      }
    }
    /* The page and the wrappers above it that Canva sized to the same height. */
    for (var el = page; el && el !== document.body; el = el.parentElement) {
      var h = pxHeight(el);
      if (Math.abs(h - oldHeight) < 2) put(el, "height", (h - saved).toFixed(2) + "px");
      else if (!isNaN(h)) break;
    }
  }

  /* ---------- the lightbox ------------------------------------------- */

  function build() {
    if (box) return;
    box = document.createElement("div");
    box.id = "sj-gbox";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML =
      '<img id="sj-gbox-img" alt="">' +
      '<div id="sj-gbox-bar">' +
        '<button id="sj-gbox-prev" type="button" aria-label="Previous photo">${ICON_PREV}</button>' +
        '<span id="sj-gbox-count" aria-live="polite"></span>' +
        '<button id="sj-gbox-next" type="button" aria-label="Next photo">${ICON_NEXT}</button>' +
      '</div>' +
      '<button id="sj-gbox-close" type="button" aria-label="Close photo viewer">${ICON_CLOSE}</button>';

    boxImg = box.querySelector("#sj-gbox-img");
    boxCount = box.querySelector("#sj-gbox-count");
    btnPrev = box.querySelector("#sj-gbox-prev");
    btnNext = box.querySelector("#sj-gbox-next");
    btnClose = box.querySelector("#sj-gbox-close");

    btnPrev.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
    btnNext.addEventListener("click", function (e) { e.stopPropagation(); step(1); });
    btnClose.addEventListener("click", function (e) { e.stopPropagation(); close(); });
    /* Anywhere off the photo and the controls closes, the usual lightbox rule. */
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    /* The overlay covers the page, so a wheel or drag over it would otherwise
       scroll Canva's content underneath. */
    box.addEventListener("wheel", block, { passive: false });
    box.addEventListener("touchmove", block, { passive: false });
    box.addEventListener("touchstart", function (e) {
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    box.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* Blocks the page behind from scrolling, but leaves two-finger gestures
     alone so pinch-to-zoom still works on a photo. */
  function block(e) { if (!e.touches || e.touches.length < 2) e.preventDefault(); }

  function render(direction) {
    /* The incoming photo slides in from the side it is travelling from:
       "next" brings the following photo in from the right. */
    boxImg.style.setProperty("--sj-gslide", (direction * 18) + "px");
    boxImg.src = photos[index];
    boxImg.alt = "Pre-wedding photo " + (index + 1) + " of " + photos.length;
    boxCount.textContent = (index + 1) + " / " + photos.length;
    /* One photo: nothing to step to. */
    btnPrev.hidden = btnNext.hidden = photos.length < 2;
    /* Restart the entrance animation: remove, force a reflow, add again. */
    boxImg.classList.remove("sj-gbox--enter");
    void boxImg.offsetWidth;
    boxImg.classList.add("sj-gbox--enter");
  }

  function open(photo) {
    build();
    mount();
    lastFocus = document.activeElement;
    index = photo;
    render(0);
    window.clearTimeout(hideTimer);
    box.hidden = false;
    /* Flush the shown-but-transparent state so the fade has something to
       transition from. Deliberately not requestAnimationFrame: a tab that is
       not visible never runs one, and the viewer would stay at opacity 0 -
       an invisible overlay swallowing every click. */
    void box.offsetWidth;
    box.classList.add("sj-gbox--open");
    btnClose.focus();
  }

  function close() {
    if (!isOpen()) return;
    box.classList.remove("sj-gbox--open");
    hideTimer = window.setTimeout(function () { box.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function step(direction) {
    if (photos.length < 2) return;
    index = (index + direction + photos.length) % photos.length;
    render(direction);
  }

  /* ---------- input --------------------------------------------------- */

  /**
   * Canva swaps the element under the cursor between pointerdown and mouseup,
   * so the click often lands on <body> and hit-testing event.target misses real
   * taps. Testing the pointer position against the tile rectangles does not.
   */
  function tileAt(x, y) {
    for (var i = 0; i < tiles.length; i++) {
      var r = tiles[i].frame.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return tiles[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    if (!onRoute() || isOpen() || !tiles.length) return;
    /* Our own floating UI sits over the page; let it have its clicks. */
    if (e.target && e.target.closest && e.target.closest("#bgm-toggle, #sj-gbox, #sj-rsvp")) return;
    var hit = tileAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    open(hit.photo);
  }, true);

  document.addEventListener("keydown", function (e) {
    if (!onRoute()) return;

    if (!isOpen()) {
      /* A focused tile opens the same way a click does. */
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      var active = document.activeElement;
      for (var i = 0; i < tiles.length; i++) {
        if (tiles[i].frame === active) {
          e.preventDefault();
          open(tiles[i].photo);
          return;
        }
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "Tab") {
      /* Keep focus inside the dialog while it is modal. */
      var stops = [];
      var all = [btnClose, btnPrev, btnNext];
      for (var j = 0; j < all.length; j++) if (!all[j].hidden) stops.push(all[j]);
      var at = stops.indexOf(document.activeElement);
      e.preventDefault();
      stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
    }
  }, true);

  /* A rotation or resize can change Canva's layout under us: redo the tiles,
     the phone grid and the crop centres from scratch. */
  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      imageCount = -1;
      sync();
    }, 200);
  });

  /* ---------- keeping up with Canva ----------------------------------- */

  function mount() {
    if (box && document.body && box.parentNode !== document.body) document.body.appendChild(box);
  }

  function sync() {
    if (!document.body) return;

    if (!onRoute()) {
      if (reflowed.length) unflow();
      if (tiles.length) untag();
      if (box) { close(); if (box.parentNode) box.parentNode.removeChild(box); }
      imageCount = -1;
    } else {
      /* Cheap steady-state check: re-scan only when the page's images changed
         or Canva re-rendered our tiles away. A full scan reads a rectangle per
         image, so it should not run on every tick. */
      var stale = document.images.length !== imageCount;
      for (var i = 0; !stale && i < tiles.length; i++) {
        if (!tiles[i].frame.isConnected || !tiles[i].frame.classList.contains("sj-gtile")) stale = true;
      }
      if (!stale && !flowIntact()) stale = true;
      if (stale) {
        /* Back to Canva's own layout first, so the scan measures the real
           grid rather than our reflow of it. */
        unflow();
        tag();
        reflow();
        imageCount = document.images.length;
      }
      if (box) mount();
    }

    if (!observer && window.MutationObserver) {
      /* Canva's render churns the subtree hard, so the callback is coalesced to
         one sync per frame rather than one per mutation record. */
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () { scheduled = false; sync(); });
  }

  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("load", sync);
  /* Canva routes with pushState, which fires no event, so the route change is
     caught by the poll. Canva also finishes rendering long after load. */
  window.addEventListener("popstate", sync);
  window.setInterval(sync, POLL);
})();
`;

/** `158, 98, 151` from `#9e6297`, for the rgba() button tint. */
function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function renderGallery(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
