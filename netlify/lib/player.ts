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

const STYLES = `
  #bgm-toggle {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 2147482000;
    width: 44px;
    height: 44px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 1px solid #ddd9cc;
    border-radius: 50%;
    background: rgba(255, 253, 248, 0.88);
    box-shadow: 0 2px 10px rgba(90, 85, 70, 0.14);
    cursor: pointer;
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    opacity: 0;
    transition: transform 200ms ease, opacity 500ms ease;
  }
  #bgm-toggle.bgm-toggle--ready { opacity: 1; }
  #bgm-toggle:hover { transform: scale(1.06); }
  #bgm-toggle:focus-visible { outline: 2px solid #c4566b; outline-offset: 3px; }

  #bgm-toggle svg {
    width: 21px;
    height: 21px;
    fill: none;
    stroke: #8a8b6f;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  #bgm-toggle .bgm-icon-slash { opacity: 0; }
  #bgm-toggle[data-muted="true"] .bgm-icon-note { stroke: #b4b0a2; }
  #bgm-toggle[data-muted="true"] .bgm-icon-slash { opacity: 1; stroke: #b4b0a2; }

  @media (prefers-reduced-motion: reduce) {
    #bgm-toggle { transition: none; }
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
      '<path class="bgm-icon-note" d="M9 17.5V7.2l8-1.6v9.6"></path>' +
      '<circle class="bgm-icon-note" cx="7" cy="17.5" r="2.2"></circle>' +
      '<circle class="bgm-icon-note" cx="15" cy="15.2" r="2.2"></circle>' +
      '<path class="bgm-icon-slash" d="M4 20L20 4"></path>' +
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
