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
 * Top-right. Checked against Canva's layout on 2026-09-13: the only thing up
 * there is the page nav, which is centred and starts at y=82 even at 390px
 * wide, so a 44px button at 16px from the corner clears it. Palette matches the
 * RSVP card (rsvp.ts).
 *
 * Pixels, not rem: Canva sets the root font-size to 10px, so 1rem is 10px here.
 */
const STYLES = `
  #bgm-toggle {
    position: fixed;
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
    z-index: 2147482000;
    width: 44px;
    height: 44px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 50%;
    background: rgba(255, 249, 251, 0.78);
    box-shadow:
      0 0 0 1px rgba(196, 86, 107, 0.12),
      0 6px 18px rgba(160, 110, 125, 0.22);
    color: #c4566b;
    cursor: pointer;
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-tap-highlight-color: transparent;
    opacity: 0;
    transition: transform 200ms ease, opacity 500ms ease, background-color 200ms ease, color 200ms ease;
  }
  #bgm-toggle.bgm-toggle--ready { opacity: 1; }
  #bgm-toggle:hover { transform: scale(1.06); background: rgba(255, 253, 254, 0.94); }
  #bgm-toggle:active { transform: scale(0.94); }
  #bgm-toggle:focus-visible { outline: 2px solid #c4566b; outline-offset: 3px; }
  #bgm-toggle[data-muted="true"] { color: #b3949d; }

  #bgm-toggle svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    overflow: visible;
  }
  #bgm-toggle .bgm-speaker { fill: currentColor; fill-opacity: 0.14; }
  #bgm-toggle .bgm-wave { transition: opacity 200ms ease; }
  #bgm-toggle .bgm-x { opacity: 0; transition: opacity 200ms ease; }
  #bgm-toggle[data-muted="true"] .bgm-wave { opacity: 0; animation: none; }
  #bgm-toggle[data-muted="true"] .bgm-x { opacity: 1; }

  /* Waves breathe while music plays, so the control reads as live. */
  #bgm-toggle[data-muted="false"] .bgm-wave { animation: bgm-wave 1.8s ease-in-out infinite; }
  #bgm-toggle[data-muted="false"] .bgm-wave--far { animation-delay: 0.3s; }
  @keyframes bgm-wave {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @media (prefers-reduced-motion: reduce) {
    #bgm-toggle { transition: none; }
    #bgm-toggle .bgm-wave { animation: none !important; }
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
  toggle.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path class="bgm-speaker" d="M3.5 9.5h3.2l4.8-4v13l-4.8-4H3.5z"></path>' +
      '<path class="bgm-wave" d="M15 9.3a3.8 3.8 0 0 1 0 5.4"></path>' +
      '<path class="bgm-wave bgm-wave--far" d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8"></path>' +
      '<path class="bgm-x" d="M15.5 9.5l5 5M20.5 9.5l-5 5"></path>' +
    '</svg>';

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

  // Some mobile browsers pause media when the tab is backgrounded.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && audio.paused && sourceReady) attemptPlay();
  });

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
  window.addEventListener("load", function () {
    mount();
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
