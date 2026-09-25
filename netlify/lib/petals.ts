/**
 * Lavender petals drifting down over the invitation, from /main onward. The
 * cover page (/) stays clean so the petals arrive with the invitation itself.
 *
 * Decoration only, so it must never get in the way: the layer ignores pointer
 * events, sits below the music toggle and the RSVP modal, animates only
 * transform and opacity, and is not rendered at all for visitors who ask for
 * reduced motion.
 *
 * Each petal is three nested elements so three motions can run on their own
 * clocks without fighting over one transform: the outer one falls and drifts
 * with the wind, the middle one swings across that line like a pendulum, and
 * the inner one turns the petal over on its own axis. Every duration, phase and
 * axis is randomised per petal, so no two fall alike and the loop never reads
 * as a loop.
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
    top: 0;
    left: var(--x);
    width: var(--size);
    height: calc(var(--size) * 0.72);
    opacity: 0;
    will-change: transform, opacity;
    animation: sj-petal-fall var(--fall) linear var(--delay) infinite;
  }
  /* Swings across the fall line. Eased at both ends, so the petal lingers at
     the edge of each swing the way a real one does before it comes back. */
  #sj-petals .sj-petal > span {
    display: block;
    width: 100%;
    height: 100%;
    animation: sj-petal-sway var(--sway) cubic-bezier(0.45, 0, 0.55, 1)
      var(--sway-delay) infinite alternate;
  }
  /* Turns the petal over. Rotating mostly about Y foreshortens it to an edge
     twice per turn; the opacity dip in the keyframes is that edge catching less
     light. Nested opacities multiply, so it reads against --alpha for free. */
  #sj-petals .sj-petal > span > b {
    display: block;
    width: 100%;
    height: 100%;
    /* Asymmetric on both axes: a rounded body with the tip drawn out to one
       corner, so it reads as a petal rather than a symmetric leaf. */
    border-radius: 96% 24% 84% 12% / 86% 38% 62% 14%;
    background:
      radial-gradient(125% 95% at 22% 16%, rgba(255, 255, 255, 0.8),
        rgba(255, 255, 255, 0.1) 54%, rgba(255, 255, 255, 0) 72%),
      linear-gradient(150deg, rgba(255, 255, 255, 0.3), var(--colour) 60%,
        rgba(86, 58, 108, 0.32));
    filter: blur(var(--blur));
    animation: sj-petal-turn var(--turn) linear var(--turn-delay) infinite
      var(--turn-dir);
  }
  /* Drift is the wind, and it eases in rather than ramping evenly, so the path
     curves instead of running dead straight. The vertical stops stay close to a
     constant speed: petals reach terminal velocity almost at once. */
  @keyframes sj-petal-fall {
    0% { transform: translate3d(0, -10vh, 0); opacity: 0; }
    7% { opacity: var(--alpha); }
    35% { transform: translate3d(calc(var(--drift) * 0.22), 30vh, 0); }
    70% { transform: translate3d(calc(var(--drift) * 0.72), 71vh, 0); }
    93% { opacity: var(--alpha); }
    100% { transform: translate3d(var(--drift), 108vh, 0); opacity: 0; }
  }
  @keyframes sj-petal-sway {
    from { transform: translateX(calc(var(--swing) * -1)) rotate(-22deg); }
    to { transform: translateX(var(--swing)) rotate(26deg); }
  }
  @keyframes sj-petal-turn {
    0% { transform: rotate3d(var(--ax), var(--ay), var(--az), 0deg); opacity: 1; }
    25% { opacity: 0.68; }
    50% { transform: rotate3d(var(--ax), var(--ay), var(--az), 180deg); opacity: 1; }
    75% { opacity: 0.68; }
    100% { transform: rotate3d(var(--ax), var(--ay), var(--az), 360deg); opacity: 1; }
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

  // Size and count follow the viewport rather than stepping at a breakpoint: a
  // fixed pixel range that looks right at 1280 reads as specks at 2048 and
  // crowds a phone. Both are clamped so phones stay cheap to animate and very
  // wide screens do not turn into a blizzard.
  var w = window.innerWidth;
  var scale = Math.min(1.35, Math.max(0.78, w / 1280));
  // Count follows screen area, not width, so a tall portrait tablet gets as
  // many petals as a short wide laptop instead of looking half empty.
  var count = Math.max(11, Math.min(28, Math.round(Math.sqrt(w * window.innerHeight) / 52)));
  var minSize = 9 * scale;
  var maxSize = 20 * scale;
  for (var i = 0; i < count; i++) {
    var petal = document.createElement("i");
    petal.className = "sj-petal";
    var style = petal.style;

    // Depth: a petal's size, speed, opacity and focus all follow from how near
    // it is, so the near ones sweep past big and sharp and the far ones hang
    // back as soft specks. One variable keeps those four in step.
    var near = Math.random();
    var size = minSize + (maxSize - minSize) * near;
    var fall = between(13, 19) - near * 4; // nearer falls faster
    style.setProperty("--size", size.toFixed(1) + "px");
    style.setProperty("--fall", fall.toFixed(2) + "s");
    style.setProperty("--alpha", (0.42 + near * 0.44).toFixed(2));
    style.setProperty("--blur", ((1 - near) * 0.9).toFixed(2) + "px");

    // Start off screen on both sides too, so petals also blow in from the edges
    // rather than every column starting full.
    style.setProperty("--x", between(-8, 106).toFixed(2) + "vw");
    style.setProperty("--drift", between(-16, 16).toFixed(1) + "vw");
    // Swing is set against the petal's own width, so the near ones sweep wide
    // and the far ones only shiver, whatever the screen size.
    style.setProperty("--swing", (size * between(0.8, 1.9)).toFixed(1) + "px");

    // Each motion gets its own period and its own negative delay, so the swing
    // and the turn are already under way on the first frame and stay out of
    // phase with the fall. Otherwise every petal turns over in lockstep.
    style.setProperty("--sway", between(2.4, 4.6).toFixed(2) + "s");
    style.setProperty("--turn", between(3.4, 9).toFixed(2) + "s");
    style.setProperty("--delay", (-between(0, fall)).toFixed(2) + "s");
    style.setProperty("--sway-delay", (-between(0, 6)).toFixed(2) + "s");
    style.setProperty("--turn-delay", (-between(0, 9)).toFixed(2) + "s");
    style.setProperty("--turn-dir", Math.random() < 0.5 ? "normal" : "reverse");

    // Tumble axis: mostly Y, which is the flip, tilted by a little X and Z so
    // the petal turns on a slant instead of spinning flat.
    style.setProperty("--ax", between(-0.5, 0.5).toFixed(2));
    style.setProperty("--ay", "1");
    style.setProperty("--az", between(-0.45, 0.45).toFixed(2));

    style.setProperty("--colour", COLOURS[i % COLOURS.length]);

    var sway = document.createElement("span");
    sway.appendChild(document.createElement("b"));
    petal.appendChild(sway);
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
