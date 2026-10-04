/**
 * Small refinements to the Our Story page, on top of the couple's Canva design:
 *
 *  - On a mouse, each photo lifts a little, with a soft shadow, while hovered.
 *  - On a phone, justified paragraphs are set ragged-right: justified text in
 *    a ~350px column opens wide gaps between words.
 *
 * Canva rebuilds this page per width (two columns on desktop, one stacked
 * column below ~1100px) and animates elements in as they scroll into view, so
 * nothing here moves or resizes anything Canva laid out:
 *
 *   wrapper    <- position:relative, exactly the photo's size: gets the lift
 *     frame    <- overflow:hidden crop box, Canva's inline transform: untouched
 *       img
 *
 * The lift uses the CSS `scale` property, which composes with Canva's own
 * `transform` instead of replacing it. Elements are only tagged with classes,
 * so a Canva re-render simply drops the tags and the next sync re-adds them.
 *
 * Injected on every page and scoped to the route at runtime, like the rest of
 * the injected UI (Canva routes client-side).
 */
import { MOBILE } from "./player.ts";

/** A prefix, so a renamed `/our-story-2` still matches. */
const ROUTE_PREFIX = "/our-story";

const STYLES = `
  @media (hover: hover) and (pointer: fine) {
    .sj-lift {
      transform-origin: 50% 50%;
      transition: scale 420ms cubic-bezier(0.22, 0.68, 0.24, 1), filter 420ms ease;
    }
    .sj-lift:hover {
      scale: 1.035;
      filter: drop-shadow(0 18px 30px rgba(45, 28, 36, 0.22));
    }
  }
  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: reduce) {
    /* The shadow alone says "this is a photo"; no movement. */
    .sj-lift:hover { scale: none; }
  }

  @media ${MOBILE} {
    .sj-ragged { text-align: left !important; }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const SCRIPT = `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  /* Smaller than this is an ornament, not a photo. */
  var MIN_PHOTO = 150;

  function onRoute() {
    return location.pathname.indexOf(ROUTE) === 0;
  }

  function untag() {
    var tagged = document.querySelectorAll(".sj-lift, .sj-ragged");
    for (var i = 0; i < tagged.length; i++) tagged[i].classList.remove("sj-lift", "sj-ragged");
  }

  /* The wrapper around a photo's crop frame, if it is exactly the photo's
     size; anything that does not look like that is left alone. */
  function liftable(img, sectionWidth) {
    var frame = img.parentElement;
    for (var i = 0; i < 5 && frame && getComputedStyle(frame).overflow !== "hidden"; i++) frame = frame.parentElement;
    if (!frame || !frame.parentElement) return null;
    var f = frame.getBoundingClientRect();
    /* Full-width images are section backgrounds. */
    if (f.width < MIN_PHOTO || f.height < MIN_PHOTO || f.width > sectionWidth * 0.9) return null;
    var wrapper = frame.parentElement;
    var w = wrapper.getBoundingClientRect();
    if (Math.abs(w.width - f.width) > 2 || Math.abs(w.height - f.height) > 2) return null;
    return wrapper;
  }

  function sync() {
    if (!document.body) return;
    if (!onRoute()) { untag(); return; }

    var sections = document.getElementsByTagName("section");
    for (var s = 0; s < sections.length; s++) {
      var width = sections[s].getBoundingClientRect().width;
      var imgs = sections[s].getElementsByTagName("img");
      for (var i = 0; i < imgs.length; i++) {
        var wrapper = liftable(imgs[i], width);
        if (wrapper && !wrapper.classList.contains("sj-lift")) wrapper.classList.add("sj-lift");
      }
    }

    /* Tagged on every screen, applied on phones only (CSS), so a rotation or
       resize needs no re-scan. */
    var blocks = document.querySelectorAll("section p, section li");
    for (var b = 0; b < blocks.length; b++) {
      if (!blocks[b].classList.contains("sj-ragged") && getComputedStyle(blocks[b]).textAlign === "justify") {
        blocks[b].classList.add("sj-ragged");
      }
    }
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
  window.setInterval(sync, 1000);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderStory(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
