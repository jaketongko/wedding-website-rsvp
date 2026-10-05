/**
 * The Gallery page's photo grid, re-set like the couple's reference
 * (2026-10-05): "THE GALLERY" with a short gold rule, the photos in an even
 * grid of rounded portrait tiles (four across on desktop, two on a phone), soft
 * lavender watercolour washes in the corners, and the shared closing footer
 * (monogram, date and venue, greeting) in place of Canva's painted card.
 *
 *   section parent        <- Canva's sections, in normal flow
 *     section (hero)      <- replaced by the full-screen opening (opening.ts)
 *     section#sj-gal      <- ours
 *     section (hidden)    <- Canva's grid section
 *
 * The photos are read from Canva's section at runtime, in reading order and as
 * many as the couple placed (repeats included), so Canva edits still show.
 * Each is loaded at the largest size Canva has. The lightbox (gallery.ts)
 * finds our tiles like any other photo, so clicking one opens it.
 *
 * If the section cannot be read, nothing is mounted and Canva's stays.
 */
import { MOBILE } from "./player.ts";
import { FOOT_HTML, footStyles, footStylesNarrow } from "./story.ts";

/** A prefix, so a `/gallery-2` copy matches too. */
const ROUTE_PREFIX = "/gallery";

const STYLES = `
  #sj-gal {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    overflow: hidden;
    padding: 4em 1.5em 0;
    background-color: #f7f5f1;
    background-position: center top;
    background-size: 100% auto;
    color: #3f3a38;
    -webkit-font-smoothing: antialiased;
  }
  #sj-gal * { box-sizing: border-box; }
  /* Soft lavender watercolour in the top corners, as in the reference. */
  #sj-gal::before,
  #sj-gal::after {
    content: "";
    position: absolute;
    top: -6em;
    width: 26em;
    height: 18em;
    pointer-events: none;
    background: radial-gradient(closest-side, rgba(196, 170, 222, 0.42), rgba(196, 170, 222, 0.18) 55%, transparent);
    filter: blur(6px);
  }
  #sj-gal::before { left: -9em; }
  #sj-gal::after { right: -9em; }
  #sj-gal > * { position: relative; z-index: 1; }

  /* ---------- the couple's flowers, behind everything ---------- */
  #sj-gal > .sjg-decor { position: absolute; z-index: 0; display: block; height: auto; pointer-events: none; }
  /* A bouquet leaning in from the top-left, beside the heading. */
  #sj-gal > .sjg-decor--left { top: -1.5em; left: -5em; width: 24em; transform: rotate(-8deg); opacity: 0.92; }
  /* One at the bottom right, by the footer. */
  #sj-gal > .sjg-decor--right { bottom: 2em; right: -4em; width: 21em; opacity: 0.9; }
  /* Flower heads drifting across the top, behind the heading, fading out
     before the photos. */
  #sj-gal > .sjg-decor--crown {
    left: 0;
    top: 0;
    width: 100%;
    height: 26em;
    object-fit: cover;
    object-position: 50% 0;
    opacity: 0.42;
    -webkit-mask-image: linear-gradient(to bottom, #000 25%, transparent 85%);
    mask-image: linear-gradient(to bottom, #000 25%, transparent 85%);
  }
  /* The meadow along the bottom edge: a low band showing the flower heads
     (the top of the art), the stems running off the bottom of the page. */
  #sj-gal > .sjg-decor--meadow {
    left: 0;
    bottom: 0;
    width: 100%;
    height: 17em;
    object-fit: cover;
    object-position: 50% 0;
    opacity: 0.5;
    -webkit-mask-image: linear-gradient(to top, #000 60%, transparent);
    mask-image: linear-gradient(to top, #000 60%, transparent);
  }

  #sj-gal .sjg-title {
    margin: 0;
    font-size: 1.9em;
    font-weight: 400;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    text-align: center;
  }
  #sj-gal .sjg-rule { display: block; width: 3.4em; height: 1px; margin: 1em auto 2.4em; background: #c9ab80; }

  #sj-gal .sjg-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1em;
    max-width: 70em;
    margin: 0 auto;
    padding: 0;
    list-style: none;
  }
  /* The tile: the lightbox (gallery.ts) treats its clipping box as the photo. */
  #sj-gal .sjg-tile {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border-radius: 0.9em;
    background: #e9e3ec;
    box-shadow: 0 0.5em 1.4em rgba(60, 45, 50, 0.12);
  }
  #sj-gal .sjg-tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 600ms ease;
  }
  #sj-gal .sjg-tile img.is-loaded { opacity: 1; }

  ${footStyles("#sj-gal")}
  /* Room underneath for the meadow, so it grows below the words. */
  #sj-gal .sj-foot { margin: 4em -1.5em 0; padding: 3.6em 1.25em 11em; }

  @media (max-width: 820px) {
    #sj-gal { padding: 3em 1em 0; }
    #sj-gal .sjg-title { font-size: 1.5em; }
    #sj-gal .sjg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7em; }
    #sj-gal .sj-foot { margin: 3em -1em 0; padding: 2.8em 1em 8em; }
    ${footStylesNarrow("#sj-gal")}
  }
  @media ${MOBILE} {
    #sj-gal::before, #sj-gal::after { width: 16em; height: 12em; }
    #sj-gal > .sjg-decor--left { top: -1em; left: -4em; width: 11em; }
    /* No room beside the footer on a phone. */
    #sj-gal > .sjg-decor--right { display: none; }
    #sj-gal > .sjg-decor--meadow { height: 11em; opacity: 0.4; }
    #sj-gal > .sjg-decor--crown { height: 16em; }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const script = (sections: Record<string, string[]>, media: Record<string, string>) => `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var SECTIONS = ${JSON.stringify(sections)};
  var LARGEST = ${JSON.stringify(media)};
  var FOOT_HTML = ${JSON.stringify(FOOT_HTML)};
  var SETTLE = 1500;   // ms with no new photo before building
  var GIVE_UP = 15000; // ms on the page before leaving Canva's grid as it is

  var root = null, canva = null;
  var count = -1, countSince = 0, since = 0;

  function onRoute() { return location.pathname.indexOf(ROUTE) === 0; }
  function pageSections() { return SECTIONS[location.pathname.replace(/^\\/+|\\/+$/g, "")] || null; }

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  /* The sharpest file Canva has of an image: its <img> always loads the 1x. */
  function sharpest(src) {
    var m = /\\/_assets\\/media\\/([0-9a-f]+\\.(?:png|jpe?g|webp))$/.exec(src || "");
    return m && LARGEST[m[1]] ? src.slice(0, src.length - m[1].length) + LARGEST[m[1]] : src;
  }

  /* The box that clips an image - what the guest sees of it. */
  function frameOf(img) {
    var f = img;
    for (var i = 0; i < 6 && f.parentElement; i++) {
      f = f.parentElement;
      if (getComputedStyle(f).overflow !== "visible") return f;
    }
    return img;
  }

  /**
   * The photos in Canva's grid section, in reading order, or null until it is
   * drawn. Skips the paper (as wide as the section) and the painted closing
   * card (much wider than tall); reports whether that card is there.
   */
  function read(section) {
    var sr = section.getBoundingClientRect();
    if (!sr.width) return null;
    var all = [], card = false;
    var imgs = section.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; i++) {
      var src = imgs[i].currentSrc || imgs[i].src;
      if (!src || src.indexOf("blob:") === 0) continue;
      var r = frameOf(imgs[i]).getBoundingClientRect();
      if (!r.width || !r.height) continue;
      /* The paper: as wide as the section and much of its height. */
      if (r.width >= sr.width * 0.9 && r.height >= sr.height * 0.5) continue;
      if (r.width > r.height * 2) { card = true; continue; }
      if (r.width < 80) continue;
      /* Canva's phone layout leaves some images hanging off the page: never
         decoration, and not part of the grid either. */
      if (r.right <= sr.left + 2 || r.left >= sr.right - 2) continue;
      all.push({ src: sharpest(src), orig: src, top: r.top - sr.top, left: r.left - sr.left, w: r.width, h: r.height });
    }
    if (!all.length) return null;
    /* The photos are the tiles: the most common size. Anything else is the
       couple's decoration (flowers added in Canva, 2026-10-05). */
    var sizes = {}, common = null;
    for (var s = 0; s < all.length; s++) {
      var key = Math.round(all[s].w / 4) + "x" + Math.round(all[s].h / 4);
      sizes[key] = (sizes[key] || 0) + 1;
      if (!common || sizes[key] > sizes[common]) common = key;
    }
    var photos = [], decor = [], isPhoto = {};
    for (var d = 0; d < all.length; d++) {
      var tile = Math.round(all[d].w / 4) + "x" + Math.round(all[d].h / 4) === common;
      (tile ? photos : decor).push(all[d]);
      if (tile) isPhoto[all[d].src] = true;
    }
    /* A photo laid out at another size (Canva's phone layout does this) is
       still a photo, never decoration. */
    decor = decor.filter(function (x) {
      if (!isPhoto[x.src]) return true;
      photos.push(x);
      return false;
    });
    photos.sort(function (a, b) { return Math.abs(a.top - b.top) < 24 ? a.left - b.left : a.top - b.top; });
    /* Where each flower goes, from where the couple put it: a wide one (not
       taller than wide) becomes the meadow along the bottom; the rest go to the top-left or
       bottom-right corner by which side they sit on. */
    var placed = [];
    for (var f = 0; f < decor.length && placed.length < 3; f++) {
      var x = decor[f];
      var kind = x.w >= sr.width * 0.6 && x.w >= x.h * 0.95 ? "meadow" : x.left + x.w / 2 < sr.width / 2 ? "left" : "right";
      placed.push({ src: x.src, kind: kind });
    }
    return { photos: photos, card: card, decor: placed };
  }

  function flowerImg(src, kind) {
    var flower = el("img", "sjg-decor sjg-decor--" + kind);
    flower.src = src;
    flower.alt = "";
    flower.setAttribute("aria-hidden", "true");
    flower.setAttribute("data-sj-nobox", "");
    flower.decoding = "async";
    return flower;
  }

  function build(got, bg) {
    var s = el("section");
    s.id = "sj-gal";
    s.setAttribute("aria-label", "The gallery");
    /* The section's full-size image: a paper texture is the background; a
       transparent flower piece (the couple's, 2026-10-05) is laid out as
       flower heads across the top and a meadow along the bottom. */
    if (bg && !bg.flowers) s.style.backgroundImage = 'url("' + bg.src + '")';
    if (bg && bg.flowers) {
      s.appendChild(flowerImg(sharpest(bg.src), "crown"));
      s.appendChild(flowerImg(sharpest(bg.src), "meadow"));
    }
    for (var d = 0; d < got.decor.length; d++) {
      if (bg && bg.flowers && got.decor[d].kind === "meadow") continue;
      /* A meadow piece also crowns the top: the same flower heads behind
         the heading, so the page opens and closes with them. */
      if (got.decor[d].kind === "meadow") s.appendChild(flowerImg(got.decor[d].src, "crown"));
      s.appendChild(flowerImg(got.decor[d].src, got.decor[d].kind));
    }
    var h = el("h2", "sjg-title");
    h.textContent = "The Gallery";
    s.appendChild(h);
    s.appendChild(el("span", "sjg-rule"));
    var list = el("ul", "sjg-grid");
    for (var i = 0; i < got.photos.length; i++) {
      var li = el("li", "sjg-tile");
      var img = el("img");
      img.alt = "";
      img.decoding = "async";
      /* Not lazy: lazy images inside Canva's own scrolling frame did not
         always load (an empty tile, 2026-10-05). The grid repeats 8 photos,
         so this costs nothing extra. */
      img.onload = function () { this.classList.add("is-loaded"); };
      /* If the larger file ever fails, fall back to the one Canva shows. */
      img.setAttribute("data-fallback", got.photos[i].orig);
      img.onerror = function () {
        var f = this.getAttribute("data-fallback");
        if (f && this.src !== f) { this.removeAttribute("data-fallback"); this.src = f; }
      };
      img.src = got.photos[i].src;
      if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
      li.appendChild(img);
      list.appendChild(li);
    }
    s.appendChild(list);
    /* The couple's closing card, re-set in real text (as on Our Story);
       only while the card is in the design. */
    if (got.card) {
      var foot = el("footer", "sj-foot");
      foot.setAttribute("data-sj-nobox", "");
      foot.innerHTML = FOOT_HTML;
      s.appendChild(foot);
    }
    return s;
  }

  /* The section's full-size image, and whether it is see-through art (a
     flower piece) rather than paper: sampled on a small canvas (the file is
     same-origin through the proxy). Undefined while it is still loading. */
  function backgroundOf(section) {
    var imgs = section.getElementsByTagName("img"), sr = section.getBoundingClientRect();
    for (var i = 0; i < imgs.length; i++) {
      var pr = imgs[i].getBoundingClientRect();
      if (!(pr.width >= sr.width * 0.9 && pr.height >= sr.height * 0.5)) continue;
      var img = imgs[i];
      if (!img.complete || !img.naturalWidth) return undefined;
      var flowers = false;
      try {
        var c = document.createElement("canvas");
        c.width = c.height = 24;
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 24, 24);
        var px = ctx.getImageData(0, 0, 24, 24).data, clear = 0;
        for (var p = 3; p < px.length; p += 4) if (px[p] < 200) clear++;
        flowers = clear > 24 * 24 * 0.15;
      } catch (e) { flowers = false; }
      return { src: img.currentSrc || img.src, flowers: flowers };
    }
    return null;
  }

  /* 16px, divided by Canva's page scale, so text keeps its size wherever
     Canva shrinks the page. */
  function size() {
    var parent = root && root.parentElement;
    if (!parent || !parent.offsetWidth) return;
    var k = parent.getBoundingClientRect().width / parent.offsetWidth || 1;
    var font = (16 / k).toFixed(3) + "px";
    if (root.style.fontSize !== font) root.style.fontSize = font;
  }

  function sync() {
    if (!document.body) return;
    if (!onRoute()) {
      /* Canva's section is NOT shown again here: during Canva's crossfade
         that flashed the original design. Ours goes once it is off screen. */
      if (root && root.parentNode && !root.getBoundingClientRect().height) root.parentNode.removeChild(root);
      if (root && !root.isConnected) root = null;
      count = -1; since = 0;
      return;
    }
    if (!since) since = Date.now();
    var ids = pageSections();
    if (!ids || ids.length < 2) return;
    var section = document.getElementById(ids[1]);
    if (!section) return;
    if (section !== canva) {
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null; canva = section; count = -1;
    }
    if (!root) {
      if (Date.now() - since > GIVE_UP) { canva.style.display = ""; return; }
      /* Back on the page with Canva's grid still hidden from last time: show
         it so it can be read again. */
      if (canva.style.display === "none") canva.style.display = "";
      var got = read(canva);
      if (!got) return;
      /* Canva adds the photos one by one: build once none has arrived for a
         moment. */
      if (got.photos.length !== count) { count = got.photos.length; countSince = Date.now(); return; }
      if (Date.now() - countSince < SETTLE) return;
      var bg = backgroundOf(canva);
      if (bg === undefined) return;
      root = build(got, bg);
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
  if (window.MutationObserver) new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", sync);
  window.addEventListener("resize", size);
  window.setInterval(sync, 500);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderGalleryPage(nonce: string | null, sections: Record<string, string[]>, media: Record<string, string> = {}): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${script(sections, media)}</script>\n`;
}
