/**
 * Lavender petals drifting down over the invitation, from /main onward. The
 * cover page (/) stays clean so the petals arrive with the invitation itself.
 *
 * Decoration only, so it must never get in the way: the layer ignores pointer
 * events, sits below the music toggle and the RSVP modal, animates only
 * transform and opacity, and is not rendered at all for visitors who ask for
 * reduced motion.
 *
 * Canva re-renders <body> after hydration and detaches injected nodes, so the
 * layer is built in JS and re-mounted from a MutationObserver, like the player.
 */
import { LAVENDER } from "./rsvp.ts";

/** The sprig buds plus one pinker shade, so the petals echo the palette. */
const PETAL_COLOURS = [...LAVENDER.buds, "#dcb6d9"];

const STYLES = `
  #sj-petals {
    position: fixed;
    inset: 0;
    /* Above Canva's content; below the music toggle (2147482000) and the RSVP
       modal (2147483100). */
    z-index: 2147481000;
    overflow: hidden;
    pointer-events: none;
    contain: strict;
  }
  #sj-petals .sj-petal {
    position: absolute;
    top: -24px;
    left: var(--x);
    width: var(--size);
    height: calc(var(--size) * 0.62);
    opacity: 0;
    will-change: transform, opacity;
    animation: sj-petal-fall var(--fall) linear var(--delay) infinite;
  }
  /* Inner element sways and tumbles while the outer one falls, so the two
     motions combine without fighting over one transform. */
  #sj-petals .sj-petal > span {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 80% 0 80% 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.55), var(--colour) 60%);
    animation: sj-petal-sway var(--sway) ease-in-out var(--delay) infinite alternate;
  }
  @keyframes sj-petal-fall {
    0% { transform: translate3d(0, -4vh, 0); opacity: 0; }
    8% { opacity: var(--alpha); }
    88% { opacity: var(--alpha); }
    100% { transform: translate3d(var(--drift), 106vh, 0); opacity: 0; }
  }
  @keyframes sj-petal-sway {
    from { transform: translateX(-14px) rotate(-30deg); }
    to { transform: translateX(14px) rotate(40deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    #sj-petals { display: none; }
  }
`;

const SCRIPT = `
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var COLOURS = ${JSON.stringify(PETAL_COLOURS)};
  var layer = document.createElement("div");
  layer.id = "sj-petals";
  layer.setAttribute("aria-hidden", "true");

  function between(min, max) { return min + Math.random() * (max - min); }

  // Fewer and smaller on phones: less to animate, and a small screen fills up
  // quickly. Larger on wide screens, where 8-16px petals read as specks.
  var phone = window.innerWidth < 600;
  var wide = window.innerWidth >= 1200;
  var count = phone ? 10 : 18;
  var minSize = wide ? 10 : 8;
  var maxSize = wide ? 19 : phone ? 14 : 16;
  for (var i = 0; i < count; i++) {
    var petal = document.createElement("i");
    petal.className = "sj-petal";
    var fall = between(11, 20);
    var style = petal.style;
    style.setProperty("--x", between(0, 100).toFixed(2) + "vw");
    style.setProperty("--size", between(minSize, maxSize).toFixed(1) + "px");
    style.setProperty("--fall", fall.toFixed(2) + "s");
    style.setProperty("--sway", between(2.2, 4).toFixed(2) + "s");
    // Negative delay: petals are already mid-fall on the first frame.
    style.setProperty("--delay", (-between(0, fall)).toFixed(2) + "s");
    style.setProperty("--drift", between(-12, 12).toFixed(1) + "vw");
    style.setProperty("--alpha", between(0.55, 0.85).toFixed(2));
    style.setProperty("--colour", COLOURS[i % COLOURS.length]);
    petal.appendChild(document.createElement("span"));
    layer.appendChild(petal);
  }

  var observer = null;
  function sync() {
    if (!document.body) return;
    // Every page except the cover. Re-inserting the layer restarts the
    // animations, and the negative delays put the petals straight back mid-fall.
    var wanted = location.pathname !== "/";
    if (wanted && layer.parentNode !== document.body) document.body.appendChild(layer);
    else if (!wanted && layer.parentNode) layer.parentNode.removeChild(layer);
    if (!observer && window.MutationObserver) {
      observer = new MutationObserver(sync);
      observer.observe(document.body, { childList: true });
    }
  }

  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("load", sync);
  // Canva routes client-side with pushState, which fires no event, so opening
  // the invitation (/ -> /main) is caught by a poll. It is one string compare.
  window.addEventListener("popstate", sync);
  window.setInterval(sync, 400);
})();
`;

export function renderPetals(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
