/**
 * Replaces Canva's form widget on the RSVP page with a form served from our own
 * origin.
 *
 * Canva's widget redirects to `https://www.canva.com/_website-element-widget`,
 * which answers with `x-frame-options: deny` and a `frame-ancestors` allowlist
 * naming `shan-and-jake-wedding.my.canva.site` and nothing else. Framed from any
 * other domain the browser refuses it outright ("www.canva.com refused to
 * connect"), so a proxied copy of the page can never show that widget.
 *
 * Submissions go to Netlify Forms. The field names here MUST match
 * public/_forms/rsvp.html, which is what registers the form at deploy time.
 *
 * Layout: a single-column card rendered in normal flow where the widget sat, so
 * it scrolls with the page rather than floating over the artwork. Because the
 * card is taller than the box Canva reserved, `ensureVisible` un-clips ancestors
 * and grows the page only as far as needed to reach the Submit button.
 *
 * This module is injected on EVERY page, not just /rsvp: Canva routes
 * client-side, so arriving at /rsvp from the invitation fires no document load.
 * The script scopes itself to the route at runtime instead.
 */

const ENDPOINT = "/_forms/rsvp.html";

/**
 * "The Seasons", the invitation's own typeface. Not self-hosted: these are the
 * files Canva already serves for the design, reached same-origin through the
 * proxy. The paths are content hashes read from Canva's page data; if the couple
 * drops the font from the design they disappear and the form falls back to
 * Georgia. Our own family name avoids colliding with whatever Canva registers.
 */
const SEASONS_FACES: Array<[weight: number, style: string, hash: string]> = [
  [300, "normal", "694ad324e926bca090d158ea2c4730c6"],
  [300, "italic", "c2db0b6c0c129d362eb609bedbaa8f64"],
  [400, "normal", "8dcc63e6bd4f6d41561f68dbc75529a1"],
  [400, "italic", "f9026ee74bca9e958959f14f08c41f48"],
  [700, "normal", "238919b47920553d7b287ec007d67e76"],
  [700, "italic", "cfcbcaabc41291782c1541b9c6e97ce8"],
];

const FONT_FACES = SEASONS_FACES.map(
  ([weight, style, hash]) => `
  @font-face {
    font-family: "SJ The Seasons";
    src: url("/_assets/fonts/${hash}.woff") format("woff");
    font-weight: ${weight};
    font-style: ${style};
    font-display: swap;
  }`,
).join("");

// Interpolated raw: wrapping it in JSON.stringify quotes the whole stack as ONE
// family name, which matches nothing and drops to the browser default font.
const FONT = '"SJ The Seasons", Georgia, "Times New Roman", serif';

/**
 * Cherry-blossom petal, drawn around the centre (16,16) of a 32x32 box with the
 * notched tip sakura are recognised by. Five of them, rotated, make a bloom.
 */
const SAKURA_PETAL =
  "M16 15.6C11.7 12.6 10.4 7.1 13.8 3.8L16 5.9 18.2 3.8C21.6 7.1 20.3 12.6 16 15.6Z";

function sakuraPetals(): string {
  return [0, 72, 144, 216, 288]
    .map((angle) => `<path d="${SAKURA_PETAL}" transform="rotate(${angle} 16 16)"/>`)
    .join("");
}

/** A bloom placed inside the 200x200 spray, centred on (cx, cy). */
function sprayBloom(cx: number, cy: number, scale: number, fill: string): string {
  return (
    `<g fill="${fill}" transform="translate(${cx} ${cy}) scale(${scale}) translate(-16 -16)">` +
    sakuraPetals() +
    `</g><circle cx="${cx}" cy="${cy}" r="${2.4 * scale}" fill="#fbe0b0"/>`
  );
}

/**
 * Botanical spray echoing the invitation's blossoms. Drawn rather than imported
 * so it costs no request and inherits no external dependency; placed at two
 * opposite corners of the card and clipped by it.
 */
const SPRAY = `
<svg class="sj-spray" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <g fill="none" stroke="#c2cbab" stroke-width="1.9" stroke-linecap="round">
    <path d="M2 198C44 162 74 128 95 92"/>
    <path d="M95 92C81 83 63 83 51 92"/>
    <path d="M62 138C50 130 37 128 25 132"/>
    <path d="M122 64C120 50 125 36 135 26"/>
  </g>
  <g fill="#cfd8b9" opacity="0.85">
    <ellipse cx="41" cy="134" rx="15" ry="6" transform="rotate(-20 41 134)"/>
    <ellipse cx="59" cy="95" rx="14" ry="6" transform="rotate(-8 59 95)"/>
  </g>
  ${sprayBloom(104, 74, 1.9, "#f0a9c1")}
  ${sprayBloom(140, 28, 1.35, "#f7c8d8")}
</svg>`;

/** Single sakura used beside the heading. */
const BLOOM = `
<svg class="sj-bloom" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <g fill="#f2a8c0">${sakuraPetals()}</g>
  <g stroke="#fbe0b0" stroke-width="1" stroke-linecap="round">
    <path d="M16 16L16 11.6"/><path d="M16 16L19.8 13.9"/>
    <path d="M16 16L18.4 19.8"/><path d="M16 16L13.6 19.8"/>
    <path d="M16 16L12.2 13.9"/>
  </g>
  <circle cx="16" cy="16" r="2.3" fill="#fbe0b0"/>
</svg>`;

const STYLES = `${FONT_FACES}
  #sj-rsvp {
    --sj-ink: #6b5c60;
    /* Dark enough to stay legible at the small, tracked-out label size. */
    --sj-muted: #90767f;
    --sj-olive: #8a8b6f;
    --sj-rose: #c4566b;
    --sj-rose-soft: #d98fa6;
    --sj-blush: #fbf1f4;
    --sj-line: #eed6dd;
    --sj-paper: #fffcfd;

    /* In normal flow, where Canva's widget sat. Deliberately NOT fixed: a fixed
       panel floats over the artwork and follows the scroll. */
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    font-family: ${FONT};
    color: var(--sj-ink);
    -webkit-font-smoothing: antialiased;
  }
  #sj-rsvp * { box-sizing: border-box; }

  /* The fallback modal is the one case that should overlay the page. */
  #sj-rsvp.sj-rsvp--overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483100;
    align-items: center;
    padding: clamp(0.75rem, 2vh, 1.5rem);
    background: rgba(72, 56, 62, 0.45);
    overflow-y: auto;
    -webkit-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
  }

  #sj-rsvp-card {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 620px;
    /* Clips the corner sprays. */
    overflow: hidden;
    background: rgba(255, 253, 254, 0.97);
    border: 1px solid rgba(196, 86, 107, 0.11);
    border-radius: 22px;
    box-shadow:
      0 1px 2px rgba(160, 110, 125, 0.05),
      0 22px 56px rgba(160, 110, 125, 0.17);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
  }

  /* Soft wash behind the heading. */
  #sj-rsvp-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 150px;
    background: linear-gradient(180deg, rgba(249, 225, 233, 0.55) 0%, rgba(249, 225, 233, 0) 100%);
    pointer-events: none;
  }
  #sj-rsvp.sj-rsvp--overlay #sj-rsvp-card { max-height: 94vh; }

  #sj-rsvp .sj-card-inner {
    position: relative;
    z-index: 1;
    padding: clamp(1.2rem, 3vw, 1.9rem) clamp(1.2rem, 3.2vw, 2rem);
  }
  #sj-rsvp.sj-rsvp--overlay .sj-card-inner { overflow-y: auto; }

  /* Decoration only - must never intercept a tap meant for a field. */
  #sj-rsvp .sj-spray {
    position: absolute;
    z-index: 0;
    width: clamp(78px, 9vw, 112px);
    height: auto;
    opacity: 0.4;
    pointer-events: none;
    user-select: none;
  }
  /* Submit is full-width now, so keep the lower accent very faint. */
  #sj-rsvp .sj-spray--bl { opacity: 0.26; }
  /* Flush to the corner with no outward offset. Anything sticking out - negative
     insets OR a translate - counts as scrollable overflow, and the card could
     then be nudged when a field takes focus.

     Top-right and bottom-left are the two genuinely empty corners: the heading
     occupies top-left and the Submit button sits bottom-right. The artwork's
     blossoms already sit at its own top-right with the stem trailing down-left,
     so the untransformed SVG lands correctly in the top-right corner. */
  #sj-rsvp .sj-spray--tr { top: 0; right: 0; }
  #sj-rsvp .sj-spray--bl { bottom: 0; left: 0; transform: rotate(180deg); }
  @media (max-width: 560px) {
    #sj-rsvp .sj-spray { opacity: 0.3; width: 84px; }
  }

  #sj-rsvp .sj-head {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: clamp(1.3rem, 2.8vh, 1.9rem);
    text-align: center;
  }
  #sj-rsvp .sj-bloom { width: 40px; height: 40px; flex: none; }
  #sj-rsvp .sj-head-text {
    font-family: ${FONT};
    font-size: clamp(1.65rem, 3.6vw, 2.1rem);
    line-height: 1.25;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    /* The Seasons runs wide; without this a wrap strands "US?" on its own line. */
    text-wrap: balance;
    color: var(--sj-rose);
  }
  #sj-rsvp .sj-head-rule {
    width: 64px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, rgba(217,143,166,0) 0%, var(--sj-rose-soft) 50%, rgba(217,143,166,0) 100%);
  }

  /* Single column, always. */
  #sj-rsvp .sj-grid { position: relative; }

  #sj-rsvp .sj-field { margin-bottom: clamp(0.85rem, 1.9vh, 1.2rem); }
  /* Only the final field in the form, not the last one in each stacked group. */
  #sj-rsvp .sj-col:last-child .sj-field:last-child { margin-bottom: 0; }

  #sj-rsvp .sj-label {
    display: block;
    margin-bottom: 0.55rem;
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    line-height: 1.5;
    color: var(--sj-muted);
  }
  #sj-rsvp .sj-req { color: var(--sj-rose); margin-left: 0.15em; }

  /* Soft filled fields - a modern control surface rather than ruled lines. */
  #sj-rsvp input[type="text"],
  #sj-rsvp textarea {
    width: 100%;
    padding: 1rem 1.15rem;
    font-family: ${FONT};
    font-size: 1.08rem;
    line-height: 1.55;
    color: var(--sj-ink);
    background: var(--sj-blush);
    border: 1px solid transparent;
    border-radius: 13px;
    transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  }
  #sj-rsvp textarea { resize: none; }
  #sj-rsvp input::placeholder, #sj-rsvp textarea::placeholder {
    color: #c8b2b9;
  }
  #sj-rsvp input:focus, #sj-rsvp textarea:focus {
    outline: none;
    background: #fffdfe;
    border-color: var(--sj-rose-soft);
    box-shadow: 0 0 0 4px rgba(217, 143, 166, 0.14);
  }

  #sj-rsvp .sj-choices { display: flex; flex-direction: column; gap: 0.5rem; }
  #sj-rsvp .sj-choice {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.95rem 1rem;
    background: var(--sj-blush);
    border: 1px solid transparent;
    border-radius: 14px;
    cursor: pointer;
    transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
  }
  #sj-rsvp .sj-choice:hover {
    border-color: rgba(217, 143, 166, 0.55);
    transform: translateY(-1px);
  }
  #sj-rsvp .sj-choice input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  /* Circular tick that fills on select. */
  #sj-rsvp .sj-mark {
    flex: none;
    width: 25px;
    height: 25px;
    position: relative;
    border: 1.5px solid rgba(217, 143, 166, 0.7);
    border-radius: 50%;
    background: #fffdfe;
    transition: border-color 180ms ease, background-color 180ms ease;
  }
  #sj-rsvp .sj-mark::after {
    content: "";
    position: absolute;
    left: 8px;
    top: 4.2px;
    width: 6px;
    height: 11px;
    border: solid #fffdfe;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0.4);
    opacity: 0;
    transition: opacity 160ms ease, transform 160ms ease;
  }
  #sj-rsvp .sj-choice-text {
    font-family: ${FONT};
    font-size: 1.26rem;
    line-height: 1.35;
    color: #6f6165;
  }
  #sj-rsvp .sj-choice--on {
    border-color: var(--sj-rose);
    background: linear-gradient(180deg, rgba(196,86,107,0.10) 0%, rgba(196,86,107,0.05) 100%);
  }
  #sj-rsvp .sj-choice--on .sj-mark {
    border-color: var(--sj-rose);
    background: var(--sj-rose);
  }
  #sj-rsvp .sj-choice--on .sj-mark::after { opacity: 1; transform: rotate(45deg) scale(1); }

  #sj-rsvp .sj-foot { margin-top: clamp(1.2rem, 2.4vh, 1.7rem); }

  #sj-rsvp .sj-required-note {
    display: block;
    margin-top: 0.85rem;
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    text-align: center;
    color: #ab959c;
  }

  #sj-rsvp .sj-submit {
    width: 100%;
    padding: 1.15rem 1.5rem;
    font-family: ${FONT};
    font-size: 0.88rem;
    font-weight: 500;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: #fffdfc;
    background: linear-gradient(135deg, #e0a0b4 0%, var(--sj-rose) 100%);
    border: none;
    border-radius: 14px;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(196, 86, 107, 0.3);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
  }
  #sj-rsvp .sj-submit:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    box-shadow: 0 10px 26px rgba(196, 86, 107, 0.34);
  }
  #sj-rsvp .sj-submit:active { transform: translateY(0); }
  #sj-rsvp .sj-submit[disabled] { opacity: 0.55; cursor: default; }

  #sj-rsvp .sj-note { margin: 0.9rem 0 0; font-size: 0.92rem; line-height: 1.5; text-align: center; }
  #sj-rsvp .sj-note--error { color: #a83a52; }
  #sj-rsvp .sj-note a { color: var(--sj-rose); }

  #sj-rsvp-done { text-align: center; padding: clamp(2rem, 6vh, 3.6rem) 1rem; }
  #sj-rsvp-done .sj-bloom { width: 52px; height: 52px; margin: 0 auto 1.1rem; display: block; }
  #sj-rsvp-done h2 {
    margin: 0 0 0.85rem;
    font-family: ${FONT};
    font-size: clamp(2.1rem, 5.2vw, 2.8rem);
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--sj-rose);
  }
  #sj-rsvp-done p { margin: 0; font-size: 1.1rem; line-height: 1.7; color: #85757a; }

  #sj-rsvp .sj-hp { position: absolute; left: -9999px; opacity: 0; }

  /* Fallback path: used only if Canva's widget never renders, so that there is
     always a way to RSVP. */
  #sj-rsvp-open {
    position: fixed;
    left: 50%;
    bottom: max(1rem, env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 2147482000;
    padding: 0.85rem 2.4rem;
    font-family: ${FONT};
    font-size: 0.68rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #fffdf8;
    background: #c4566b;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 18px rgba(70, 62, 48, 0.3);
  }

  #sj-rsvp-close {
    position: absolute;
    top: 0.35rem;
    right: 0.55rem;
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
    line-height: 1;
    color: #9d9587;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  #sj-rsvp-close:hover { color: var(--sj-rose); }
`;

const SCRIPT = `
(function () {
  var ENDPOINT = ${JSON.stringify(ENDPOINT)};
  var WIDGET_MATCH = "_website-element-widget";
  var mounted = false;
  var fallback = null;
  var formNode = null;
  var onRsvpSince = 0;

  // Inlined at build time from the module constants.
  var SPRAY = ${JSON.stringify(SPRAY)};
  var BLOOM = ${JSON.stringify(BLOOM)};

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (html != null) node.innerHTML = html;
    return node;
  }

  function choice(value, text) {
    return '<label class="sj-choice" data-choice="' + value + '">' +
      '<input type="radio" name="attending" value="' + value + '">' +
      '<span class="sj-mark"></span>' +
      '<span class="sj-choice-text">' + text + '</span>' +
    '</label>';
  }

  function buildForm(withClose) {
    var wrap = el("div", { id: "sj-rsvp" });
    if (withClose) wrap.className = "sj-rsvp--overlay";
    wrap.innerHTML =
      '<div id="sj-rsvp-card">' +
        SPRAY.replace("sj-spray", "sj-spray sj-spray--tr") +
        SPRAY.replace("sj-spray", "sj-spray sj-spray--bl") +
        (withClose
          ? '<button id="sj-rsvp-close" type="button" aria-label="Close">&#10005;</button>'
          : "") +
        '<div class="sj-card-inner">' +
        '<div class="sj-head">' + BLOOM +
          '<span class="sj-head-text">Will you celebrate with us?</span>' +
          '<span class="sj-head-rule"></span>' +
        '</div>' +
        '<form id="sj-rsvp-form" novalidate>' +
          '<div class="sj-hp"><label>Do not fill this in ' +
            '<input name="bot-field" tabindex="-1" autocomplete="off"></label></div>' +

          '<div class="sj-grid">' +
            '<div class="sj-col">' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-name">Full name<span class="sj-req">*</span></label>' +
                '<input id="sj-name" name="name" type="text" autocomplete="name">' +
              '</div>' +
              '<div class="sj-field">' +
                '<span class="sj-label">Will you attend our wedding?<span class="sj-req">*</span></span>' +
                '<div class="sj-choices">' +
                  choice("yes", "Wouldn&rsquo;t miss it for the world!") +
                  choice("no", "Sending love from afar.") +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="sj-col">' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-dietary">Dietary restrictions or allergies' +
                  '<span class="sj-req">*</span></label>' +
                '<textarea id="sj-dietary" name="dietary" rows="2"></textarea>' +
              '</div>' +
              '<div class="sj-field">' +
                '<label class="sj-label" for="sj-message">Leave a message for the bride &amp; groom</label>' +
                '<textarea id="sj-message" name="message" rows="3"></textarea>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="sj-foot">' +
            '<button type="submit" class="sj-submit">Submit</button>' +
            '<span class="sj-required-note">' +
              'Fields marked <span class="sj-req">*</span> are required' +
            '</span>' +
          '</div>' +
          '<p class="sj-note" id="sj-rsvp-note"></p>' +
        '</form>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  function wire(root) {
    var form = root.querySelector("#sj-rsvp-form");
    var note = root.querySelector("#sj-rsvp-note");
    var button = root.querySelector(".sj-submit");

    function attending() {
      var picked = form.querySelector('input[name="attending"]:checked');
      return picked ? picked.value : "";
    }

    root.addEventListener("change", function (event) {
      if (event.target.name !== "attending") return;
      var choices = root.querySelectorAll(".sj-choice");
      for (var i = 0; i < choices.length; i++) {
        choices[i].classList.toggle("sj-choice--on", choices[i].querySelector("input").checked);
      }
    });

    function fail(message, focusId) {
      note.className = "sj-note sj-note--error";
      note.textContent = message;
      var field = focusId && root.querySelector(focusId);
      if (field) field.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      note.className = "sj-note";
      note.textContent = "";

      var data = new FormData(form);
      var coming = attending() === "yes";

      if (!String(data.get("name") || "").trim()) {
        return fail("Please tell us your full name.", "#sj-name");
      }
      if (!attending()) {
        return fail("Please let us know if you can make it.");
      }
      // Only enforced for a guest who is actually coming - asking someone who
      // has declined about catering makes no sense.
      if (coming && !String(data.get("dietary") || "").trim()) {
        return fail(
          "Please note any dietary needs, or write \\u201cnone\\u201d.",
          "#sj-dietary"
        );
      }

      data.append("form-name", "rsvp");
      var body = new URLSearchParams();
      data.forEach(function (value, key) { body.append(key, value); });

      button.disabled = true;
      button.textContent = "Sending";

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          var card = root.querySelector("#sj-rsvp-card");
          card.innerHTML =
            SPRAY.replace("sj-spray", "sj-spray sj-spray--tr") +
            SPRAY.replace("sj-spray", "sj-spray sj-spray--bl") +
            '<div class="sj-card-inner"><div id="sj-rsvp-done">' +
              BLOOM +
              "<h2>Thank you</h2>" +
              "<p>" + (coming
                ? "We cannot wait to celebrate with you."
                : "We will miss you, but thank you for letting us know.") +
              "</p>" +
            "</div></div>";
        })
        .catch(function (error) {
          console.warn("[rsvp] submission failed:", error);
          button.disabled = false;
          button.textContent = "Submit";
          note.className = "sj-note sj-note--error";
          note.innerHTML =
            'Sorry, that did not send. Please try again, or RSVP ' +
            '<a href="https://shan-and-jake-wedding.my.canva.site/rsvp" target="_blank" ' +
            'rel="noopener">here</a>.';
        });
    });
  }

  /**
   * The vertical form is taller than the box Canva reserved for the widget
   * (~565px). Left alone the bottom of the card - including the Submit
   * button - could be clipped.
   *
   * So: un-clip any ancestor that would cut it off. The overflow then extends
   * the scroll range of Canva's own page scroller, which reaches the card.
   *
   * Canva scrolls the page inside a container, not the document, so the
   * document is always one viewport tall. Growing <body> to fit the card
   * therefore made the document scroll too, putting a second scrollbar beside
   * Canva's. Only grow the page if no ancestor scrolls at all.
   */
  function ensureVisible(form) {
    var card = form.querySelector("#sj-rsvp-card");
    if (!card) return;

    var node = form.parentElement;
    for (var i = 0; i < 6 && node && node !== document.body; i++) {
      var cs = window.getComputedStyle(node);
      // Never un-clip Canva's page scroller; that would stop the page scrolling.
      if (cs.overflowY === "auto" || cs.overflowY === "scroll") break;
      if (cs.overflow !== "visible") node.style.overflow = "visible";
      node = node.parentElement;
    }

    if (hasScrollingAncestor(form)) return;

    var needed = Math.ceil(
      card.getBoundingClientRect().bottom + (window.pageYOffset || 0) + 48
    );
    if (needed > document.documentElement.scrollHeight) {
      document.body.style.minHeight = needed + "px";
      if (window.getComputedStyle(document.documentElement).overflowY === "hidden") {
        document.documentElement.style.overflowY = "auto";
      }
      if (window.getComputedStyle(document.body).overflowY === "hidden") {
        document.body.style.overflowY = "visible";
      }
    }
  }

  function hasScrollingAncestor(el) {
    for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      var overflowY = window.getComputedStyle(n).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return true;
    }
    return false;
  }

  /** Mounted in place of the widget so it sits in the page and scrolls with it. */
  function swap(frame) {
    var parent = frame.parentNode;
    if (!parent) return;

    var form = buildForm(false);
    parent.replaceChild(form, frame);
    wire(form);
    formNode = form;
    mounted = true;
    ensureVisible(form);
  }

  window.addEventListener("resize", function () {
    if (formIsLive() && !formNode.classList.contains("sj-rsvp--overlay")) {
      ensureVisible(formNode);
    }
  });

  function formIsLive() {
    return Boolean(formNode && document.documentElement.contains(formNode));
  }

  function findWidget() {
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      var src = frames[i].getAttribute("src") || frames[i].src || "";
      if (src.indexOf(WIDGET_MATCH) !== -1) return frames[i];
    }
    return null;
  }

  /**
   * Fallback so there is ALWAYS a way to RSVP.
   *
   * Canva's renderer is slow and occasionally paints nothing at all, and the
   * widget URL is theirs to change. If the in-place swap has not happened,
   * offer the same form rather than leaving a guest with no option.
   */
  function addFallbackButton() {
    if (mounted || fallback) return;

    var open = el("button", { id: "sj-rsvp-open", type: "button" }, "RSVP");
    open.addEventListener("click", function () {
      var panel = buildForm(true);
      document.body.appendChild(panel);
      wire(panel);

      function dismiss() {
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      }
      panel.querySelector("#sj-rsvp-close").addEventListener("click", dismiss);
      document.addEventListener("keydown", function onKey(event) {
        if (event.key !== "Escape") return;
        document.removeEventListener("keydown", onKey);
        dismiss();
      });
    });

    fallback = open;
    document.body.appendChild(open);
  }

  /**
   * Canva re-renders the page body repeatedly, detaching anything we inserted.
   * So this never stops watching and never assumes a previous mount survived:
   * it re-swaps a lost form and re-attaches a lost fallback button.
   */
  function tick() {
    // Canva navigates between pages client-side, so the form must take itself
    // down if we are no longer on /rsvp - it belongs to that page alone.
    if (!/^\\/(rsvp\\/?|_preview-rsvp)$/i.test(location.pathname)) {
      if (formNode && formNode.parentNode) formNode.parentNode.removeChild(formNode);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      formNode = null;
      fallback = null;
      mounted = false;
      onRsvpSince = 0;
      return;
    }

    if (formIsLive()) return;

    // Measured from arrival on the route, not from page load: a guest can reach
    // /rsvp minutes later via client-side navigation.
    if (!onRsvpSince) onRsvpSince = Date.now();

    var frame = findWidget();
    if (frame) {
      swap(frame);
      if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
      fallback = null;
      return;
    }

    // Canva's widget has not appeared. Give it a grace period, then guarantee
    // a way to RSVP regardless.
    if (Date.now() - onRsvpSince > 12000) addFallbackButton();

    // Re-appending the same node preserves its listener.
    if (fallback && fallback.parentNode !== document.body && document.body) {
      document.body.appendChild(fallback);
    }
  }

  tick();

  if (window.MutationObserver) {
    var pending = null;
    var observer = new MutationObserver(function () {
      // Canva mutates the DOM constantly; coalesce bursts into one check.
      if (pending) return;
      pending = window.setTimeout(function () {
        pending = null;
        tick();
      }, 150);
    });
    // No timeout: a slow phone or a slow network must not lose the form.
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  /**
   * Canva routes between pages client-side. The observer catches most of it,
   * but a history change plus a low-frequency poll makes arriving at /rsvp from
   * the invitation reliable - that path fires no document load, and missing it
   * leaves Canva's broken widget on screen.
   */
  window.addEventListener("popstate", tick);
  window.addEventListener("hashchange", tick);
  window.setInterval(tick, 1500);

  tick();
})();
`;

export function renderRsvp(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
