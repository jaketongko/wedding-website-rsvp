/**
 * The music player injected into the proxied Canva page.
 *
 * There is no click-gate: the Canva invitation is the first and only thing a
 * guest sees. Because browsers block autoplay with sound until the page has
 * been interacted with, playback is attempted in three stages:
 *
 *   1. play unmuted - succeeds for guests whose browser already trusts the site
 *      (Chrome's Media Engagement Index, or a returning visitor)
 *   2. if that is refused, play MUTED, which is always permitted, so the track
 *      is already rolling
 *   3. unmute on the guest's first pointer/touch/key interaction, fading the
 *      volume in
 *
 * Canva's client framework re-parents and re-renders body content after
 * hydration, which detaches plain markup and drops directly-bound listeners.
 * So the player builds its DOM in JS, keeps stable references, and re-mounts
 * itself whenever Canva moves it.
 */

/*
 * A small black vinyl record floating in the top-right corner. It spins while
 * the music plays and stops where it is when muted, when a badge also appears.
 *
 * Top-right. Checked against Canva's layout on 2026-09-13: the only thing up
 * there is the page nav, which is centred and starts at y=82 even at 390px
 * wide, so a 48px button at 16px from the corner clears it, bob and shadow
 * included. The label and badge use the RSVP card's accent (rsvp.ts).
 * On phones it sits lower-left instead (2026-10-04, at the couple's request),
 * so the main page's menu button can have the top-right corner.
 *
 * Canva scrolls an inner, full-width element, so on desktops with classic
 * scrollbars the scrollbar sits inside the viewport, under a right-anchored
 * button. The script measures it into --bgm-scrollbar so the gap to the
 * scrollbar matches the gap to the top. Overlay scrollbars (phones, macOS)
 * measure 0.
 *
 * Pixels, not rem: Canva sets the root font-size to 10px, so 1rem is 10px here.
 */

/** "Mobile" for the injected UI: a phone upright, or on its side. */
export const MOBILE = "(max-width: 600px), (max-height: 520px)";

const STYLES = `
  #bgm-toggle {
    position: fixed;
    top: max(16px, env(safe-area-inset-top));
    right: calc(max(16px, env(safe-area-inset-right)) + var(--bgm-scrollbar, 0px));
    z-index: 2147482000;
    width: 48px;
    height: 48px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    opacity: 0;
    transition: transform 200ms ease, opacity 500ms ease;
  }
  #bgm-toggle.bgm-toggle--ready { opacity: 1; }
  #bgm-toggle:hover { transform: scale(1.06); }
  #bgm-toggle:active { transform: scale(0.94); }
  #bgm-toggle:focus-visible { outline: 2px solid #9e6297; outline-offset: 2px; }

  /* Bobs gently; the shadow tightens as the record sinks, so it reads as
     hovering over the page rather than sliding up and down. Kept separate from
     the disc so the bob and the spin do not share one transform. */
  #bgm-toggle .bgm-float {
    position: relative;
    display: block;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    animation: bgm-float 4.5s ease-in-out infinite;
  }
  @keyframes bgm-float {
    0%, 100% {
      transform: translateY(-2px);
      box-shadow: 0 10px 18px rgba(45, 25, 45, 0.22), 0 3px 6px rgba(45, 25, 45, 0.14);
    }
    50% {
      transform: translateY(2px);
      box-shadow: 0 5px 10px rgba(45, 25, 45, 0.3), 0 1px 3px rgba(45, 25, 45, 0.2);
    }
  }

  /* Paused rather than removed when muted, so the record stops where it is
     and picks up from there, like a turntable. */
  #bgm-toggle .bgm-disc {
    display: block;
    width: 100%;
    height: 100%;
    animation: bgm-spin 3s linear infinite paused;
  }
  #bgm-toggle[data-muted="false"] .bgm-disc { animation-play-state: running; }
  @keyframes bgm-spin { to { transform: rotate(360deg); } }

  /* Light catching the grooves. It does not spin with the record, which is
     what makes the record look like it is turning under a light. */
  #bgm-toggle .bgm-sheen {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 20deg,
      transparent 0deg, rgba(255, 255, 255, 0.16) 28deg, transparent 56deg,
      transparent 180deg, rgba(255, 255, 255, 0.1) 208deg, transparent 236deg
    );
    pointer-events: none;
  }

  #bgm-toggle .bgm-badge {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fffdfe;
    box-shadow: 0 1px 4px rgba(45, 25, 45, 0.28);
    color: #9e6297;
    opacity: 0;
    transform: scale(0.6);
    transition: opacity 200ms ease, transform 200ms ease;
  }
  #bgm-toggle[data-muted="true"] .bgm-badge { opacity: 1; transform: scale(1); }
  #bgm-toggle .bgm-badge svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  #bgm-toggle .bgm-badge .bgm-speaker { fill: currentColor; fill-opacity: 0.2; }

  /* Phones: lower left, leaving the top right to the main page's menu button.
     MOBILE is shared with slideshow.ts so the two always switch together. */
  @media ${MOBILE} {
    #bgm-toggle {
      top: auto;
      right: auto;
      bottom: max(16px, env(safe-area-inset-bottom));
      left: max(16px, env(safe-area-inset-left));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    #bgm-toggle, #bgm-toggle .bgm-badge { transition: none; }
    #bgm-toggle .bgm-float, #bgm-toggle .bgm-disc { animation: none; }
  }
`;

const SCRIPT = `
(function () {
  var STORAGE_KEY = "sj-bgm-muted";
  var SOURCES = [
    { src: "/_wedding/bgm.mp3", type: "audio/mpeg" },
    { src: "/_wedding/bgm.wav", type: "audio/wav" }
  ];
  var TARGET_VOLUME = 0.55;
  var FADE_MS = 1200;

  var bodyObserver = null;
  var sourceReady = false;
  var mutedByChoice = false;
  var unmuteArmed = false;

  var audio = document.createElement("audio");
  audio.id = "bgm-audio";
  audio.loop = true;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.volume = TARGET_VOLUME;

  var toggle = document.createElement("button");
  toggle.id = "bgm-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Mute music");
  toggle.setAttribute("aria-pressed", "false");
  // The record: grooves, the brighter gap between two tracks, a label with two
  // lines of "print" (so the spin is visible), and the spindle hole.
  toggle.innerHTML =
    '<span class="bgm-float">' +
      '<svg class="bgm-disc" viewBox="0 0 44 44" aria-hidden="true" focusable="false">' +
        '<circle cx="22" cy="22" r="22" fill="#141214"></circle>' +
        '<g fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="0.5">' +
          '<circle cx="22" cy="22" r="19.5"></circle>' +
          '<circle cx="22" cy="22" r="17.5"></circle>' +
          '<circle cx="22" cy="22" r="14.5"></circle>' +
          '<circle cx="22" cy="22" r="12.5"></circle>' +
        '</g>' +
        '<circle cx="22" cy="22" r="16" fill="none" stroke="#ffffff" stroke-opacity="0.13" stroke-width="0.8"></circle>' +
        '<circle cx="22" cy="22" r="21.6" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="0.7"></circle>' +
        '<circle cx="22" cy="22" r="9" fill="#b67fae"></circle>' +
        '<path d="M17.5 18.6h9M18.5 25.4h7" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.1" stroke-linecap="round"></path>' +
        '<circle cx="22" cy="22" r="1.6" fill="#f7f2ef"></circle>' +
      '</svg>' +
      '<span class="bgm-sheen"></span>' +
      '<span class="bgm-badge">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path class="bgm-speaker" d="M3.5 9.5h3.2l4.8-4v13l-4.8-4H3.5z"></path>' +
          '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5"></path>' +
        '</svg>' +
      '</span>' +
    '</span>';

  var nodes = [audio, toggle];

  function readMuted() {
    try { return window.localStorage.getItem(STORAGE_KEY) === "1"; }
    catch (error) { return false; }
  }
  function writeMuted(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); }
    catch (error) { /* private mode - the session still works */ }
  }

  mutedByChoice = readMuted();

  function paintToggle() {
    toggle.setAttribute("data-muted", audio.muted ? "true" : "false");
    toggle.setAttribute("aria-pressed", audio.muted ? "true" : "false");
    toggle.setAttribute("aria-label", audio.muted ? "Unmute music" : "Mute music");
    toggle.title = audio.muted ? "Play music" : "Mute music";
  }

  /**
   * Music is a nice-to-have and must never break the invitation. Some browsers
   * throw synchronously here instead of returning a rejected promise.
   * Resolves true only when playback actually began.
   */
  function attemptPlay() {
    try {
      var result = audio.play();
      if (result && typeof result.then === "function") {
        return result.then(function () { return true; }, function () { return false; });
      }
      return Promise.resolve(!audio.paused);
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  function fadeTo(target) {
    var steps = 24;
    var from = audio.volume;
    var step = 0;
    var timer = window.setInterval(function () {
      step += 1;
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * (step / steps)));
      if (step >= steps) window.clearInterval(timer);
    }, FADE_MS / steps);
  }

  function unmute() {
    audio.muted = false;
    audio.volume = 0;
    if (audio.paused) attemptPlay();
    fadeTo(TARGET_VOLUME);
    paintToggle();
  }

  // Any real interaction counts as the gesture browsers require. Scrolling does
  // NOT, so it is deliberately not in this list.
  function armUnmuteOnGesture() {
    if (unmuteArmed) return;
    unmuteArmed = true;

    var events = ["pointerdown", "touchstart", "mousedown", "click", "keydown"];
    function onGesture() {
      events.forEach(function (name) {
        document.removeEventListener(name, onGesture, true);
      });
      unmuteArmed = false;
      if (!mutedByChoice) unmute();
    }
    events.forEach(function (name) {
      document.addEventListener(name, onGesture, true);
    });
  }

  function start() {
    if (!sourceReady) return;

    if (mutedByChoice) {
      // Respect a previous choice: roll silently, let the toggle undo it.
      audio.muted = true;
      attemptPlay();
      paintToggle();
      return;
    }

    audio.muted = false;
    attemptPlay().then(function (playing) {
      if (playing) {
        paintToggle();
        return;
      }
      // Unmuted autoplay refused. Muted autoplay is always allowed, so get the
      // track rolling and swap the sound in on the first interaction.
      audio.muted = true;
      attemptPlay();
      paintToggle();
      armUnmuteOnGesture();
    });
  }

  /**
   * Picks the first source that actually exists.
   *
   * A <source> list cannot do this: when the first entry 404s the element sits
   * at readyState 0 / networkState 2 without ever firing "error", so nothing
   * advances the chain. Asking for the file settles it deterministically.
   */
  function selectSource(index) {
    if (index >= SOURCES.length) {
      console.warn("[bgm] No playable audio source. Add public/_wedding/bgm.mp3.");
      return;
    }
    var candidate = SOURCES[index];
    fetch(candidate.src, { method: "HEAD" })
      .then(function (response) {
        if (!response.ok) {
          selectSource(index + 1);
          return;
        }
        audio.src = candidate.src;
        audio.load();
        sourceReady = true;
        start();
      })
      .catch(function () { selectSource(index + 1); });
  }

  // Re-attaches our nodes whenever Canva's framework detaches or re-parents
  // them. Re-appending the same node objects preserves their listeners.
  function mount() {
    if (!document.body) return;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode !== document.body) document.body.appendChild(nodes[i]);
    }
    watchBody();
  }

  function watchBody() {
    if (!window.MutationObserver || !document.body) return;
    if (bodyObserver) bodyObserver.disconnect();
    bodyObserver = new MutationObserver(function () { mount(); });
    bodyObserver.observe(document.body, { childList: true });
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest || !target.closest("#bgm-toggle")) return;
    event.preventDefault();
    event.stopPropagation();

    if (audio.muted) {
      mutedByChoice = false;
      writeMuted(false);
      unmute();
    } else {
      mutedByChoice = true;
      writeMuted(true);
      audio.muted = true;
      paintToggle();
    }
  }, true);

  // The platform's scrollbar width, which Canva's inner scroller also uses.
  // Re-measured on resize, since browser zoom changes it in CSS pixels.
  function measureScrollbar() {
    if (!document.body) return;
    var probe = document.createElement("div");
    probe.style.cssText = "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";
    document.body.appendChild(probe);
    toggle.style.setProperty("--bgm-scrollbar", probe.offsetWidth - probe.clientWidth + "px");
    document.body.removeChild(probe);
  }
  window.addEventListener("resize", measureScrollbar);

  // Some mobile browsers pause media when the tab is backgrounded.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && audio.paused && sourceReady) attemptPlay();
  });

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
  window.addEventListener("load", function () {
    mount();
    // Measured before the reveal, so the button never visibly jumps.
    measureScrollbar();
    // Reveal the control only once there is something to control.
    toggle.classList.add("bgm-toggle--ready");
    paintToggle();
  });

  selectSource(0);
})();
`;

export function renderPlayer(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
