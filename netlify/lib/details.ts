/**
 * The Details page, re-set so every part reads at a glance: each category in
 * its own bubble card, and the FAQ as an accordion.
 *
 *   section parent        <- Canva's sections, in normal flow
 *     section (hero)      <- replaced by the full-screen opening (opening.ts)
 *     section#sj-details  <- ours: intro, lake painting, then the cards
 *     section (hidden)    <- Canva's details section
 *     section#sj-faq      <- ours: the accordion
 *     section (hidden)    <- Canva's FAQ section
 *     section (gift)      <- Canva's, untouched
 *
 * What is read from Canva at runtime, so the couple's edits still show: the
 * intro lines, the lake painting, the venue photo and its lines, every FAQ
 * question and answer, the paper, and the fonts.
 *
 * What is HERE, because in Canva it is painted into images (unreadable on a
 * phone): the timeline, the dress code and the reminders. Their artwork was
 * cut out of those images once, into public/_wedding/details/. If the couple
 * changes those strips in Canva, update CELEBRATION / DRESS / THINGS.
 *
 * If the details section cannot be read, nothing is mounted and Canva's stays;
 * the same goes for the FAQ on its own.
 */
import { MOBILE } from "./player.ts";
import { FONT, REPLY_BY } from "./rsvp.ts";

/** A prefix, so a `/details-2` copy matches too. */
const ROUTE_PREFIX = "/details";

/** Directions to the venue, as the couple asked. */
const MAP_URL =
  "https://www.google.com/maps/dir/Ligaya+Drive,+4232%2BG9R,+Ligaya+Dr,+Talisay,+Batangas/" +
  "Nuuk+Taal+Lake,+Km+89,+Brgy,+295+Talisay+-+Laurel+Rd,+Berinayan,+Laurel,+4221+Batangas/" +
  "@14.0849408,120.9704203,14.5z/data=!4m14!4m13!1m5!1m1!1s0x33bd70a50eaa0daf:0xc8777f8fa0a535ee" +
  "!2m2!1d121.0008977!2d14.1038744!1m5!1m1!1s0x33bd779f026da8e1:0x338f9dc6b50bcca2!2m2!1d120.9565642" +
  "!2d14.0692687!3e0?entry=ttu&g_ep=EgoyMDI2MDkzMC4wIKXMDSoASAFQAw%3D%3D";

const ART = "/_wedding/details/";

/** The timeline, from Canva's "THE CELEBRATION" strip. */
const CELEBRATION: Array<{ time: string; title: string; text: string; art: string }> = [
  { time: "1:00 PM", title: "Guest Arrival", text: "We can’t wait to welcome you.", art: "arrival" },
  { time: "3:00 PM", title: "Ceremony", text: "Where our forever begins.", art: "ceremony" },
  { time: "4:00 PM", title: "Cocktail Hour", text: "A little time to mingle and celebrate.", art: "cocktail" },
  { time: "6:00 PM", title: "Dinner & Program", text: "Good food, great company, and an evening to remember.", art: "dinner" },
  { time: "10:00 PM", title: "Farewell", text: "Until next time. Thank you for celebrating with us!", art: "farewell" },
];

/** From Canva's "DRESS WITH US" strip. */
const DRESS = {
  title: "Petals & Pastels",
  attire: "Semi-formal to formal attire",
  swatches: [
    ["Mauve", "mauve"],
    ["Plum", "plum"],
    ["Lavender", "lavender"],
    ["Burgundy", "burgundy"],
    ["Dusty Rose", "dustyrose"],
    ["Sage", "sage"],
  ],
  note: ["Gentle pastel and rich jewel tones are encouraged.", "Please reserve white for the bride."],
};

const icon = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" ` +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

/** From Canva's "A FEW THINGS TO KNOW" strip; arrival and the date updated by
 *  the couple on 2026-10-05 (the strip said June 06, 2026). "{rsvp}" becomes a
 *  link to the RSVP page. */
const THINGS: Array<{ icon: string; title: string; text: string }> = [
  {
    icon: icon('<circle cx="12" cy="12.5" r="8"/><path d="M12 8.5v4l2.8 1.8M9.5 3h5"/>'),
    title: "Arrival",
    text: "Doors open at 1:00 PM. Please be seated by 2:45 PM for the 3:00 PM ceremony.",
  },
  {
    icon: icon('<path d="M3.5 12a8.5 8.5 0 0 1 17 0z"/><path d="M12 12v6.2a2 2 0 0 1-4 0M12 3.5V2.6"/>'),
    title: "Weather",
    text: "Our celebration will be outdoors, so comfortable footwear is encouraged.",
  },
  {
    icon: icon('<rect x="3.5" y="8.5" width="17" height="4" rx="0.8"/><path d="M5 12.5v8h14v-8M12 8.5v12"/><path d="M12 8.5C10.6 5.2 7 4.6 7 6.6s3 1.9 5 1.9zM12 8.5c1.4-3.3 5-3.9 5-1.9s-3 1.9-5 1.9z"/>'),
    title: "Gifts",
    text: "Your presence is the greatest gift. But if you’d like to bless us further, we would be truly grateful.",
  },
  {
    icon: icon('<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
    title: "RSVP",
    text: `Kindly confirm your attendance through our {rsvp} by ${REPLY_BY}.`,
  },
];

const PIN = icon('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>');
const PLUS = icon('<path d="M12 5v14M5 12h14"/>');

/**
 * Sized in em from a root font-size the script sets: 16px divided by Canva's
 * page scale (it shrinks the page with a transform on narrow phones). Never
 * rem - Canva sets `html { font-size: 10px }`.
 */
const STYLES = `
  /* Canva's sections while they are read: drawn (Canva only draws what is
     near the screen) but unseen, and out of the way. */
  section.sjd-reading {
    position: absolute !important;
    top: 0;
    left: 0;
    width: 100%;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  #sj-details, #sj-faq {
    --sjd-ink: #3f3a38;
    --sjd-muted: #6f6763;
    --sjd-accent: #8a6aa8;
    --sjd-gold: #c9ab80;
    --sjd-line: rgba(164, 127, 196, 0.26);
    --sjd-rule: rgba(120, 100, 90, 0.18);
    position: relative;
    box-sizing: border-box;
    width: 100%;
    background-color: #f7f5f1;
    background-position: center top;
    background-size: 100% auto;
    color: var(--sjd-ink);
    font-family: "Lato", "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #sj-details * , #sj-faq * { box-sizing: border-box; }
  #sj-details { padding: 4.5em 1.5em 2.5em; }
  #sj-faq { padding: 2.5em 1.5em 5em; }
  #sj-details .sjd-inner { max-width: 62em; margin: 0 auto; }

  /* ---------- the intro and the lake, open on the paper ---------- */
  #sj-details .sjd-intro { text-align: center; margin-bottom: 2.4em; }
  #sj-details .sjd-intro p { margin: 0; line-height: 1.35; }
  #sj-details .sjd-intro p + p { margin-top: 0.15em; }
  #sj-details .sjd-intro .sjd-gap { margin-top: 1em; }
  /* The painting's own paper is a shade lighter than the page's: fade its
     edges out so no rectangle shows. */
  #sj-details .sjd-landscape {
    display: block;
    width: min(56em, 100%);
    height: auto;
    margin: 0 auto 3em;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent);
    -webkit-mask-composite: source-in;
    mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent), linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent);
    mask-composite: intersect;
  }

  /* ---------- the bubble cards ---------- */
  #sj-details .sjd-card {
    margin: 0 auto 2.2em;
    padding: 2.6em 2.6em 2.8em;
    background: #fffefd;
    border: 1px solid var(--sjd-line);
    border-radius: 2em;
    box-shadow: 0 1em 2.8em rgba(60, 50, 45, 0.07);
  }
  #sj-details .sjd-kicker {
    margin: 0;
    font-size: 1em;
    font-weight: 400;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    text-align: center;
    color: var(--sjd-ink);
  }
  #sj-details .sjd-rule { display: block; width: 3em; height: 1px; margin: 0.9em auto 2em; background: var(--sjd-gold); }
  #sj-details .sjd-head { text-transform: uppercase; letter-spacing: 0.12em; }

  /* The timeline: five columns with hairlines between. */
  #sj-details .sjd-events { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
  #sj-details .sjd-event { padding: 0 1em; text-align: center; }
  #sj-details .sjd-event + .sjd-event { border-left: 1px solid var(--sjd-rule); }
  #sj-details .sjd-art { display: block; width: 100%; max-width: 9.5em; height: 5.6em; margin: 0 auto 1em; object-fit: contain; }
  #sj-details .sjd-time { margin: 0 0 0.45em; font-size: 0.82em; letter-spacing: 0.2em; color: var(--sjd-muted); }
  #sj-details .sjd-event h3 { margin: 0 0 0.5em; font-size: 1.08em; font-weight: 400; line-height: 1.3; }
  #sj-details .sjd-event p.sjd-say { margin: 0; font-size: 1.12em; line-height: 1.45; color: var(--sjd-muted); }

  /* The venue: the photo beside its lines. */
  #sj-details .sjd-venue { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 2.4em; align-items: center; padding: 1.4em; }
  #sj-details .sjd-venue-photo { display: block; width: 100%; height: auto; border-radius: 1.3em; }
  #sj-details .sjd-venue-text { padding: 1em 1.4em 1em 0; text-align: center; }
  #sj-details .sjd-venue-name { margin: 0 0 0.25em; font-size: 2.6em; font-weight: 400; line-height: 1.1; }
  #sj-details .sjd-venue-place { margin: 0 0 1.1em; font-size: 0.9em; letter-spacing: 0.24em; color: var(--sjd-muted); }
  #sj-details .sjd-venue-about { margin: 0 auto 1.8em; max-width: 22em; font-size: 1.2em; line-height: 1.5; color: var(--sjd-muted); }
  #sj-details .sjd-map {
    display: inline-flex;
    align-items: center;
    gap: 0.7em;
    padding: 0.95em 1.9em;
    border: 1px solid var(--sjd-gold);
    border-radius: 999px;
    background: #fff;
    color: var(--sjd-ink);
    font-size: 0.78em;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background-color 180ms ease, box-shadow 180ms ease;
  }
  #sj-details .sjd-map:hover { background: #fbf7f1; box-shadow: 0 0.4em 1.2em rgba(60, 50, 45, 0.08); }
  #sj-details .sjd-map svg { width: 1.45em; height: 1.45em; color: var(--sjd-gold); }

  /* Dress with us: the palette, and the outfits beside it. */
  #sj-details .sjd-dress { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1.5em; align-items: center; }
  #sj-details .sjd-dress-main { text-align: center; }
  #sj-details .sjd-dress .sjd-rule { margin-bottom: 1.1em; }
  #sj-details .sjd-script { margin: 0 0 0.15em; font-size: 3.8em; font-weight: 400; line-height: 1.15; }
  #sj-details .sjd-attire { margin: 0 0 1.8em; font-size: 0.82em; letter-spacing: 0.24em; text-transform: uppercase; color: var(--sjd-muted); }
  #sj-details .sjd-swatches { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2em 0.6em; margin: 0 0 1.6em; padding: 0; list-style: none; }
  #sj-details .sjd-swatches li { width: 5.6em; text-align: center; }
  #sj-details .sjd-swatches img { display: block; width: 3.6em; height: 3.6em; margin: 0 auto 0.5em; object-fit: contain; }
  #sj-details .sjd-swatches span { font-size: 0.95em; color: var(--sjd-muted); }
  #sj-details .sjd-note { margin: 0; font-size: 1.12em; line-height: 1.55; color: var(--sjd-muted); }
  #sj-details .sjd-outfits {
    display: block;
    width: 14em;
    height: auto;
    -webkit-mask-image: radial-gradient(closest-side, #000 82%, transparent);
    mask-image: radial-gradient(closest-side, #000 82%, transparent);
  }

  /* A few things to know: four columns with hairlines between. */
  #sj-details .sjd-things { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
  #sj-details .sjd-thing { padding: 0 1.3em; text-align: center; }
  #sj-details .sjd-thing + .sjd-thing { border-left: 1px solid var(--sjd-rule); }
  #sj-details .sjd-thing-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.9em;
    height: 2.9em;
    margin-bottom: 0.9em;
    border: 1px solid var(--sjd-line);
    border-radius: 50%;
    color: var(--sjd-accent);
  }
  #sj-details .sjd-thing-icon svg { width: 1.35em; height: 1.35em; }
  #sj-details .sjd-thing h3 { margin: 0 0 0.6em; font-size: 0.92em; font-weight: 400; letter-spacing: 0.22em; text-transform: uppercase; }
  #sj-details .sjd-thing p { margin: 0; font-size: 0.98em; line-height: 1.65; color: var(--sjd-muted); }
  #sj-details .sjd-thing a { color: var(--sjd-accent); text-decoration: underline; text-underline-offset: 0.2em; }

  /* ---------- the FAQ: a heading, then an accordion ---------- */
  #sj-faq .sjd-faq-inner { max-width: 52em; margin: 0 auto; }
  #sj-faq .sjd-faq-title { width: max-content; max-width: 100%; margin: 0 auto 2.4em; font-weight: 400; line-height: 0.95; }
  #sj-faq .sjd-faq-caps { display: block; font-size: 2.8em; letter-spacing: 0.06em; text-transform: uppercase; }
  #sj-faq .sjd-faq-row { display: flex; align-items: flex-end; }
  /* The script word tucked in after "ASKED", dropping below its baseline. */
  #sj-faq .sjd-faq-script { margin: 0 0 -0.32em -0.08em; font-size: 3.4em; line-height: 1; }
  #sj-faq .sjd-faq-list { margin: 0; padding: 0; list-style: none; }
  #sj-faq .sjd-q {
    margin: 0 0 0.95em;
    background: #fdfbf6;
    border-radius: 1.1em;
    box-shadow: 0 0.35em 1.4em rgba(60, 50, 45, 0.08);
  }
  #sj-faq .sjd-q-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2em;
    width: 100%;
    margin: 0;
    padding: 1.45em 1.9em;
    border: 0;
    background: none;
    color: var(--sjd-ink);
    font-family: "Playfair Display", Georgia, "Times New Roman", serif;
    font-size: 1.28em;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
  }
  #sj-faq .sjd-q-btn svg { flex: none; width: 1.05em; height: 1.05em; color: #b7a1a8; transition: transform 260ms ease; }
  #sj-faq .sjd-q.is-open .sjd-q-btn svg { transform: rotate(45deg); }
  #sj-faq .sjd-q-btn:focus-visible { outline: 2px solid #a47fc4; outline-offset: -2px; border-radius: 1.1em; }
  /* Opens to its own height: a one-row grid going from 0fr to 1fr. */
  #sj-faq .sjd-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms ease; }
  #sj-faq .sjd-q.is-open .sjd-a { grid-template-rows: 1fr; }
  #sj-faq .sjd-a > div { overflow: hidden; }
  #sj-faq .sjd-a p { margin: 0; padding: 0 1.9em 1.6em; font-size: 1.05em; line-height: 1.8; color: #5f5653; }

  /* Each card rises in as it scrolls into view, as Canva's own elements did. */
  #sj-details .sjd-card.sjd-reveal { opacity: 0; transform: translateY(1.6em); }
  #sj-details .sjd-card.sjd-reveal.is-in {
    opacity: 1;
    transform: none;
    transition: opacity 800ms ease, transform 900ms cubic-bezier(0.22, 0.68, 0.24, 1);
  }

  /* ---------- tablets: the timeline and reminders wrap ---------- */
  @media (max-width: 980px) {
    #sj-details .sjd-events { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 2.2em; }
    #sj-details .sjd-event:nth-child(3n + 1) { border-left: 0; }
    #sj-details .sjd-things { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 2em; }
    #sj-details .sjd-thing:nth-child(2n + 1) { border-left: 0; }
    #sj-details .sjd-outfits { width: 11em; }
  }

  /* ---------- phones: one column, icons beside the text ---------- */
  @media (max-width: 640px) {
    #sj-details { padding: 3em 1em 1.5em; }
    #sj-faq { padding: 1.5em 1em 3.5em; }
    #sj-details .sjd-landscape { margin-bottom: 2em; }
    #sj-details .sjd-card { padding: 1.9em 1.3em 2em; border-radius: 1.6em; margin-bottom: 1.6em; }
    #sj-details .sjd-rule { margin-bottom: 1.4em; }

    #sj-details .sjd-events, #sj-details .sjd-things { grid-template-columns: 1fr; row-gap: 0; }
    #sj-details .sjd-event, #sj-details .sjd-thing {
      display: grid;
      grid-template-columns: 5.6em minmax(0, 1fr);
      gap: 0 1em;
      align-items: center;
      padding: 1.1em 0.2em;
      text-align: left;
    }
    #sj-details .sjd-event + .sjd-event, #sj-details .sjd-thing + .sjd-thing { border-left: 0; border-top: 1px solid var(--sjd-rule); }
    #sj-details .sjd-art { grid-row: span 3; height: 4.4em; margin: 0; }
    #sj-details .sjd-thing { grid-template-columns: 3em minmax(0, 1fr); align-items: start; }
    #sj-details .sjd-thing-icon { grid-row: span 2; margin: 0.1em 0 0; }
    #sj-details .sjd-event p.sjd-say { font-size: 1.05em; }

    #sj-details .sjd-venue { grid-template-columns: 1fr; gap: 1.4em; padding: 0.8em 0.8em 1.8em; }
    #sj-details .sjd-venue-text { padding: 0 0.5em; }
    #sj-details .sjd-venue-name { font-size: 2.1em; }

    #sj-details .sjd-dress { grid-template-columns: 1fr; }
    #sj-details .sjd-outfits { order: -1; width: 10em; margin: 0 auto; }
    #sj-details .sjd-script { font-size: 3.2em; }
    #sj-details .sjd-intro { font-size: 0.8em; }
    #sj-details .sjd-swatches { gap: 1em 0.6em; }
    #sj-details .sjd-swatches li { width: 30%; }

    #sj-faq .sjd-faq-caps { font-size: 1.95em; }
    #sj-faq .sjd-faq-script { font-size: 2.5em; }
    #sj-faq .sjd-q-btn { padding: 1.2em 1.25em; font-size: 1.12em; }
    #sj-faq .sjd-a p { padding: 0 1.4em 1.3em; font-size: 1em; }
  }
  @media ${MOBILE} {
    #sj-details .sjd-map { padding: 1em 1.6em; }
  }
  @media (prefers-reduced-motion: reduce) {
    #sj-details .sjd-card.sjd-reveal { opacity: 1; transform: none; }
    #sj-faq .sjd-a, #sj-faq .sjd-q-btn svg { transition: none; }
  }
`;

/** ES5 on purpose, like the other injected scripts: no build step transpiles it. */
const script = (sections: Record<string, string[]>) => `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var SECTIONS = ${JSON.stringify(sections)};
  var ART = ${JSON.stringify(ART)};
  var MAP_URL = ${JSON.stringify(MAP_URL)};
  var CELEBRATION = ${JSON.stringify(CELEBRATION)};
  var DRESS = ${JSON.stringify(DRESS)};
  var THINGS = ${JSON.stringify(THINGS)};
  var PIN = ${JSON.stringify(PIN)};
  var PLUS = ${JSON.stringify(PLUS)};
  var FALLBACK = ${JSON.stringify(FONT)};
  var IMAGE_WAIT = 6000;   // for Canva's photos, after its text has read
  var FONT_WAIT = 15000;   // for Canva to draw the FAQ heading's fonts

  var details = null, canvaDetails = null;   // ours, and Canva's it stands in for
  var faq = null, canvaFaq = null;
  var faqStyled = false, faqSince = 0;
  var firstRead = 0;
  var observer = null;

  function onRoute() { return location.pathname.indexOf(ROUTE) === 0; }
  function pageSections() { return SECTIONS[location.pathname.replace(/^\\/+|\\/+$/g, "")] || null; }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function clean(text) { return text.replace(/\\s+/g, " ").trim(); }

  /* A paragraph's text with Canva's line breaks as spaces - innerText of a
     hidden node drops them - but real newlines kept: the FAQ's hidden text
     layer puts each answer on the line after its question. */
  function textOf(p) {
    var copy = p.cloneNode(true);
    var brs = copy.getElementsByTagName("br");
    for (var i = brs.length - 1; i >= 0; i--) brs[i].parentNode.replaceChild(document.createTextNode(" "), brs[i]);
    return copy.textContent || "";
  }

  function look(p) {
    var cs = getComputedStyle(p.querySelector("span") || p);
    return { font: cs.fontFamily, color: cs.color, size: parseFloat(cs.fontSize), spacing: parseFloat(cs.letterSpacing) || 0, upper: cs.textTransform === "uppercase" };
  }
  /* Canva's hidden text layer, before the section is drawn. */
  function unstyled(l) { return /Times New Roman/.test(l.font) || l.size < 11; }

  /* ---------- reading Canva's sections ---------- */

  function readDetails(section) {
    var sr = section.getBoundingClientRect();
    if (!sr.width) return null;
    var blocks = [];
    var ps = section.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      var r = ps[i].getBoundingClientRect();
      var t = clean(textOf(ps[i]));
      if (!t || !r.width) continue;
      var l = look(ps[i]);
      if (unstyled(l)) return null;
      blocks.push({ text: t, top: r.top, bottom: r.bottom, left: r.left, look: l });
    }
    if (blocks.length < 2) return null;
    blocks.sort(function (a, b) { return Math.abs(a.top - b.top) < 4 ? a.left - b.left : a.top - b.top; });

    /* The paper is the biggest image. Photos are roughly landscape; the
       painted strips (timeline, button, dress code, reminders) are much
       wider than tall, and are what our cards replace. */
    var paper = null, most = 0, photos = [];
    var imgs = section.getElementsByTagName("img");
    for (var m = 0; m < imgs.length; m++) {
      var src = imgs[m].currentSrc || imgs[m].src;
      var ir = imgs[m].getBoundingClientRect();
      if (!src || !ir.width) continue;
      if (ir.width * ir.height > most) { most = ir.width * ir.height; paper = { src: src, img: imgs[m] }; }
    }
    if (paper && paper.img.getBoundingClientRect().width < sr.width * 0.9) paper = null;
    for (var n = 0; n < imgs.length; n++) {
      var s2 = imgs[n].currentSrc || imgs[n].src;
      var r2 = imgs[n].getBoundingClientRect();
      if (!s2 || !r2.width || (paper && imgs[n] === paper.img)) continue;
      if (r2.width >= 200 && r2.width / r2.height < 2.3) photos.push({ src: s2, top: r2.top, bottom: r2.bottom, ratio: r2.width / r2.height });
    }
    photos.sort(function (a, b) { return a.top - b.top; });
    if (photos.length < 2 || !paper) {
      if (!firstRead) firstRead = Date.now();
      if (Date.now() - firstRead < IMAGE_WAIT) return null;
    }

    /* The intro is above the lake painting; the venue's lines below it. */
    var lake = photos[0] || null;
    var intro = [], venue = [];
    for (var b = 0; b < blocks.length; b++) {
      if (!lake || blocks[b].bottom <= lake.top + 2) intro.push(blocks[b]);
      else venue.push(blocks[b]);
    }
    return { paper: paper ? paper.src : null, intro: intro, lake: lake, venuePhoto: photos[1] || null, venue: venue };
  }

  /* Questions are the lines ending in "?"; the lines after one are its
     answer. Works on both the hidden text layer (question, newline, answer)
     and Canva's drawn text (a paragraph each). */
  function readFaq(section) {
    var ps = section.querySelectorAll("p");
    var items = [], heading = [], seen = {}, seenHead = {}, current = null;
    for (var i = 0; i < ps.length; i++) {
      var l = look(ps[i]);
      var lines = textOf(ps[i]).split(/\\n+/);
      for (var j = 0; j < lines.length; j++) {
        var line = clean(lines[j]);
        if (!line) continue;
        if (/\\?$/.test(line) && line.length <= 160) {
          var key = line.toLowerCase();
          current = seen[key] ? { skip: true } : { q: line, a: [] };
          seen[key] = true;
          if (!current.skip) items.push(current);
        } else if (current) {
          if (!current.skip) current.a.push(line);
        } else {
          /* Both of Canva's text layers can be there at once: keep each
             heading line once, preferring the drawn (styled) one. */
          var hk = line.toLowerCase();
          if (seenHead[hk] === undefined) { seenHead[hk] = heading.length; heading.push({ text: line, look: l }); }
          else if (unstyled(heading[seenHead[hk]].look) && !unstyled(l)) heading[seenHead[hk]].look = l;
        }
      }
    }
    return items.length >= 2 ? { items: items, heading: heading } : null;
  }

  /* The FAQ heading's two looks, once Canva has drawn it: the caps line and
     the script word. Null while it is still the hidden text layer. */
  function faqFonts(section) {
    var got = readFaq(section);
    if (!got || got.heading.length < 2) return null;
    var caps = got.heading[0].look, script = got.heading[got.heading.length - 1].look;
    if (unstyled(caps) || unstyled(script) || caps.font === script.font) return null;
    return { caps: caps.font, script: script.font, color: caps.color };
  }

  /* ---------- building ours ---------- */

  function styleLike(node, block) {
    node.style.fontFamily = block.look.font + ", " + FALLBACK;
    if (block.look.upper) node.style.textTransform = "uppercase";
    return node;
  }

  function line(tag, cls, block) {
    var node = styleLike(el(tag, cls), block);
    node.textContent = block.text;
    return node;
  }

  function heading(text, fonts) {
    var frag = document.createDocumentFragment();
    var h = el("h2", "sjd-kicker");
    h.textContent = text;
    h.style.fontFamily = fonts.head;
    frag.appendChild(h);
    frag.appendChild(el("span", "sjd-rule"));
    return frag;
  }

  function art(name, cls, alt) {
    var img = el("img", cls);
    img.src = ART + name + ".webp";
    img.alt = alt || "";
    img.decoding = "async";
    img.loading = "lazy";
    return img;
  }

  function buildCelebration(fonts) {
    var card = el("article", "sjd-card sjd-reveal");
    card.setAttribute("aria-label", "The celebration");
    card.appendChild(heading("The Celebration", fonts));
    var list = el("ol", "sjd-events");
    for (var i = 0; i < CELEBRATION.length; i++) {
      var e = CELEBRATION[i];
      var item = el("li", "sjd-event");
      item.appendChild(art(e.art, "sjd-art"));
      var time = el("p", "sjd-time"); time.textContent = e.time;
      var title = el("h3", "sjd-head"); title.textContent = e.title; title.style.fontFamily = fonts.head;
      var say = el("p", "sjd-say"); say.textContent = e.text; say.style.fontFamily = fonts.body;
      item.appendChild(time); item.appendChild(title); item.appendChild(say);
      list.appendChild(item);
    }
    card.appendChild(list);
    return card;
  }

  function buildVenue(content, fonts) {
    var card = el("article", "sjd-card sjd-venue sjd-reveal");
    card.setAttribute("aria-label", "The venue");
    if (content.venuePhoto) {
      var photo = el("img", "sjd-venue-photo");
      photo.src = content.venuePhoto.src;
      photo.alt = "";
      photo.decoding = "async";
      card.appendChild(photo);
    }
    var text = el("div", "sjd-venue-text");
    /* Canva's lines, in order: the kicker, the name, the place, then the rest. */
    var v = content.venue;
    if (v[0]) {
      var k = line("h2", "sjd-kicker", v[0]);
      text.appendChild(k);
      text.appendChild(el("span", "sjd-rule"));
    }
    if (v[1]) text.appendChild(line("p", "sjd-venue-name", v[1]));
    if (v[2]) text.appendChild(line("p", "sjd-venue-place", v[2]));
    for (var i = 3; i < v.length; i++) text.appendChild(line("p", "sjd-venue-about", v[i]));
    var map = el("a", "sjd-map", PIN + "<span>View on Google Maps</span>");
    map.href = MAP_URL;
    map.target = "_blank";
    map.rel = "noopener";
    map.setAttribute("data-sjd-map", "");
    text.appendChild(map);
    card.appendChild(text);
    if (!content.venuePhoto) card.style.gridTemplateColumns = "1fr";
    return card;
  }

  function buildDress(fonts) {
    var card = el("article", "sjd-card sjd-dress sjd-reveal");
    card.setAttribute("aria-label", "Dress code");
    var main = el("div", "sjd-dress-main");
    main.appendChild(heading("Dress with Us", fonts));
    var title = el("p", "sjd-script");
    title.textContent = DRESS.title;
    title.style.fontFamily = fonts.script;
    main.appendChild(title);
    var attire = el("p", "sjd-attire"); attire.textContent = DRESS.attire;
    main.appendChild(attire);
    var list = el("ul", "sjd-swatches");
    for (var i = 0; i < DRESS.swatches.length; i++) {
      var li = el("li");
      li.appendChild(art(DRESS.swatches[i][1]));
      var name = el("span"); name.textContent = DRESS.swatches[i][0];
      li.appendChild(name);
      list.appendChild(li);
    }
    main.appendChild(list);
    var note = el("p", "sjd-note");
    note.style.fontFamily = fonts.body;
    note.innerHTML = DRESS.note.join("<br>");
    main.appendChild(note);
    card.appendChild(main);
    card.appendChild(art("attire", "sjd-outfits", "A burgundy suit and a lavender gown"));
    return card;
  }

  function buildThings(fonts) {
    var card = el("article", "sjd-card sjd-reveal");
    card.setAttribute("aria-label", "A few things to know");
    card.appendChild(heading("A Few Things to Know", fonts));
    var list = el("ul", "sjd-things");
    for (var i = 0; i < THINGS.length; i++) {
      var item = el("li", "sjd-thing");
      item.appendChild(el("span", "sjd-thing-icon", THINGS[i].icon));
      var h = el("h3"); h.textContent = THINGS[i].title; h.style.fontFamily = fonts.head;
      var p = el("p");
      var parts = THINGS[i].text.split("{rsvp}");
      p.appendChild(document.createTextNode(parts[0]));
      if (parts.length > 1) {
        var a = el("a"); a.href = "/rsvp"; a.textContent = "RSVP page"; a.setAttribute("data-sjd-rsvp", "");
        p.appendChild(a);
        p.appendChild(document.createTextNode(parts[1]));
      }
      item.appendChild(h); item.appendChild(p);
      list.appendChild(item);
    }
    card.appendChild(list);
    return card;
  }

  function fontsFrom(content) {
    var head = FALLBACK, body = "Georgia, serif";
    for (var i = 0; i < content.intro.length; i++) {
      if (i === 0) head = content.intro[0].look.font + ", " + FALLBACK;
      else if (content.intro[i].look.font !== content.intro[0].look.font) { body = content.intro[i].look.font + ", Georgia, serif"; break; }
    }
    return { head: head, body: body, script: FALLBACK };
  }

  function buildDetails(content) {
    var fonts = fontsFrom(content);
    var section = el("section");
    section.id = "sj-details";
    section.setAttribute("aria-label", "The details");
    if (content.paper) section.style.backgroundImage = 'url("' + content.paper + '")';
    var inner = el("div", "sjd-inner");

    /* The intro, as Canva sets it: its fonts and letter-spacing, sized
       against its own first line; a new face starts a new paragraph. */
    if (content.intro.length) {
      var intro = el("div", "sjd-intro");
      var base = content.intro[0].look.size || 24;
      for (var i = 0; i < content.intro.length; i++) {
        var b = content.intro[i];
        var p = line("p", null, b);
        p.style.fontSize = (1.45 * b.look.size / base).toFixed(3) + "em";
        if (b.look.spacing) p.style.letterSpacing = (b.look.spacing / b.look.size).toFixed(3) + "em";
        p.style.color = b.look.color;
        if (i && (b.look.font !== content.intro[i - 1].look.font || b.top - content.intro[i - 1].bottom > b.look.size)) p.className = "sjd-gap";
        intro.appendChild(p);
      }
      inner.appendChild(intro);
    }
    if (content.lake) {
      var lake = el("img", "sjd-landscape");
      lake.src = content.lake.src;
      lake.alt = "";
      lake.decoding = "async";
      inner.appendChild(lake);
    }
    inner.appendChild(buildCelebration(fonts));
    inner.appendChild(buildVenue(content, fonts));
    inner.appendChild(buildDress(fonts));
    inner.appendChild(buildThings(fonts));
    section.appendChild(inner);
    return section;
  }

  function buildFaq(got) {
    var section = el("section");
    section.id = "sj-faq";
    section.setAttribute("aria-label", "Frequently asked questions");
    var inner = el("div", "sjd-faq-inner");
    var h = el("h2", "sjd-faq-title");
    var capsText = got.heading.length > 1 ? got.heading.slice(0, -1).map(function (x) { return x.text; }).join(" ") : "Frequently asked";
    var scriptText = got.heading.length > 1 ? got.heading[got.heading.length - 1].text : "questions";
    /* As in Canva: the caps on two lines, the script word tucked in after
       the last one. */
    var words = capsText.split(" ");
    var first = el("span", "sjd-faq-caps");
    first.textContent = words.length > 1 ? words.slice(0, -1).join(" ") : capsText;
    h.appendChild(first);
    var row = el("span", "sjd-faq-row");
    if (words.length > 1) {
      var last = el("span", "sjd-faq-caps");
      last.textContent = words[words.length - 1];
      row.appendChild(last);
    }
    var scr = el("span", "sjd-faq-script");
    scr.textContent = scriptText;
    row.appendChild(scr);
    h.appendChild(row);
    inner.appendChild(h);

    var list = el("ul", "sjd-faq-list");
    for (var i = 0; i < got.items.length; i++) {
      var li = el("li", "sjd-q" + (i === 0 ? " is-open" : ""));
      var id = "sjd-a-" + i;
      var btn = el("button", "sjd-q-btn");
      btn.type = "button";
      btn.setAttribute("aria-expanded", i === 0 ? "true" : "false");
      btn.setAttribute("aria-controls", id);
      var q = el("span"); q.textContent = got.items[i].q;
      btn.appendChild(q);
      btn.insertAdjacentHTML("beforeend", PLUS);
      var a = el("div", "sjd-a");
      a.id = id;
      var wrap = el("div");
      var p = el("p"); p.textContent = got.items[i].a.join(" ");
      wrap.appendChild(p);
      a.appendChild(wrap);
      li.appendChild(btn);
      li.appendChild(a);
      list.appendChild(li);
    }
    inner.appendChild(list);
    section.appendChild(inner);
    return section;
  }

  /* Kept, so a details section built after the FAQ still gets the script. */
  var faqLook = null;
  function applyFaqFonts(f) {
    faqLook = f;
    if (!faq) return;
    var caps = faq.querySelectorAll(".sjd-faq-caps"), scr = faq.querySelector(".sjd-faq-script");
    for (var i = 0; i < caps.length; i++) { caps[i].style.fontFamily = f.caps + ", " + FALLBACK; caps[i].style.color = f.color; }
    if (scr) { scr.style.fontFamily = f.script + ", " + FALLBACK; scr.style.color = f.color; }
    var dress = details && details.querySelector(".sjd-script");
    if (dress) dress.style.fontFamily = f.script + ", " + FALLBACK;
  }

  /* ---------- interaction ---------- */

  function toggle(btn) {
    var item = btn.closest(".sjd-q");
    var open = !item.classList.contains("is-open");
    item.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function goRsvp() {
    /* Through Canva's own router, with a keyed entry like its links push. */
    var state = { key: Math.random().toString(36).slice(2, 8) };
    history.pushState(state, "", "/rsvp");
    window.dispatchEvent(new PopStateEvent("popstate", { state: state }));
  }

  /* By position, not event.target: Canva swaps the element under the pointer
     between pointerdown and mouseup, so the click can land on <body>. */
  function hitAt(x, y) {
    var roots = [details, faq];
    for (var r = 0; r < roots.length; r++) {
      if (!roots[r] || !roots[r].isConnected) continue;
      var targets = roots[r].querySelectorAll(".sjd-q-btn, [data-sjd-map], [data-sjd-rsvp]");
      for (var i = 0; i < targets.length; i++) {
        var b = targets[i].getBoundingClientRect();
        if (b.width && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return targets[i];
      }
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    if (!onRoute() || (!details && !faq)) return;
    var over = e.detail !== 0 && document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest && over.closest("#sj-menu, #bgm-toggle")) return;
    var hit = e.detail === 0 ? (e.target.closest && e.target.closest(".sjd-q-btn, [data-sjd-map], [data-sjd-rsvp]")) : hitAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    if (hit.hasAttribute("data-sjd-map")) window.open(MAP_URL, "_blank", "noopener");
    else if (hit.hasAttribute("data-sjd-rsvp")) goRsvp();
    else toggle(hit);
  }, true);

  function reveal(section) {
    var cards = section.querySelectorAll(".sjd-card");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.IntersectionObserver || reduce) {
      for (var i = 0; i < cards.length; i++) cards[i].classList.remove("sjd-reveal");
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
    }, { threshold: 0.1 });
    for (var c = 0; c < cards.length; c++) observer.observe(cards[c]);
  }

  /* 16px, divided by Canva's page scale, so text keeps its size wherever
     Canva shrinks the page. */
  function size(node) {
    var parent = node && node.parentElement;
    if (!parent || !parent.offsetWidth) return;
    var k = parent.getBoundingClientRect().width / parent.offsetWidth || 1;
    var font = (16 / k).toFixed(3) + "px";
    if (node.style.fontSize !== font) node.style.fontSize = font;
  }

  /* ---------- leaving the page ---------- */

  /* Nothing is restored while Canva fades the old page out - un-hiding its
     sections there flashed the original design. Ours stay until Canva
     removes that page, then go. */
  var leftBehind = [];
  function leaveBehind(node, anchor) {
    if (anchor) anchor.classList.remove("sjd-reading");
    if (node && anchor && anchor.isConnected) leftBehind.push({ node: node, anchor: anchor });
    else if (node && node.parentNode) node.parentNode.removeChild(node);
  }
  function onScreen(node) {
    if (!node || !node.isConnected) return false;
    var r = node.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (var n = node; n && n !== document.documentElement; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false;
    }
    return true;
  }
  function settleLeftBehind(force) {
    for (var i = leftBehind.length - 1; i >= 0; i--) {
      var l = leftBehind[i];
      var gone = !l.anchor.isConnected;
      if (!gone && !force && onScreen(l.node)) continue;
      if (l.node.parentNode) l.node.parentNode.removeChild(l.node);
      if (!gone) l.anchor.style.display = "";
      leftBehind.splice(i, 1);
    }
  }

  /* ---------- Canva's sections ---------- */

  /* The FAQ is the section whose text holds questions; the details section
     is the first after the hero that is not it. */
  function findSections() {
    if (canvaDetails && canvaFaq && canvaDetails.isConnected && canvaFaq.isConnected) return { details: canvaDetails, faq: canvaFaq };
    var ids = pageSections();
    if (!ids || ids.length < 2) return null;
    var found = { details: null, faq: null };
    for (var i = 1; i < ids.length; i++) {
      var s = document.getElementById(ids[i]);
      if (!s) continue;
      if (!found.faq && readFaq(s)) found.faq = s;
      else if (!found.details && !found.faq) found.details = s;
    }
    return found;
  }

  function mount(node, anchor) {
    if (node.nextElementSibling !== anchor) anchor.parentNode.insertBefore(node, anchor);
    anchor.classList.remove("sjd-reading");
    if (anchor.style.display !== "none") anchor.style.display = "none";
    size(node);
  }

  /**
   * Canva re-renders and routes client-side, so this runs often and assumes
   * nothing survived: it re-reads a replaced section, re-inserts a detached
   * one, and takes everything down off the route.
   */
  function sync() {
    if (!document.body) return;
    var here = onRoute();
    var ids = pageSections() || [];
    var back = false;
    for (var lb = 0; lb < leftBehind.length; lb++) if (here && ids.indexOf(leftBehind[lb].anchor.id) !== -1) back = true;
    settleLeftBehind(back);
    if (!here) {
      if (details || canvaDetails || faq || canvaFaq) {
        if (observer) observer.disconnect();
        leaveBehind(details, canvaDetails);
        leaveBehind(faq, canvaFaq);
        details = canvaDetails = faq = canvaFaq = null;
        faqStyled = false; faqSince = 0; firstRead = 0;
      }
      return;
    }

    var found = findSections();
    if (!found) return;

    /* The details section: read it while Canva draws it out of sight. */
    if (found.details && found.details !== canvaDetails) {
      if (canvaDetails) canvaDetails.style.display = "";
      if (details && details.parentNode) details.parentNode.removeChild(details);
      details = null;
      canvaDetails = found.details;
      firstRead = 0;
    }
    if (canvaDetails && !details) {
      canvaDetails.classList.add("sjd-reading");
      var got = readDetails(canvaDetails);
      if (got) {
        details = buildDetails(got);
        if (faqLook) applyFaqFonts(faqLook);
        reveal(details);
      }
    }
    if (details && canvaDetails) mount(details, canvaDetails);

    /* The FAQ: built at once from its text; its heading takes Canva's fonts
       when Canva has drawn them. */
    if (found.faq && found.faq !== canvaFaq) {
      if (canvaFaq) canvaFaq.style.display = "";
      if (faq && faq.parentNode) faq.parentNode.removeChild(faq);
      faq = null;
      canvaFaq = found.faq;
      faqStyled = false;
      faqSince = Date.now();
    }
    if (canvaFaq && !faq) {
      var items = readFaq(canvaFaq);
      if (items) faq = buildFaq(items);
    }
    if (faq && canvaFaq) {
      if (!faqStyled) {
        var f = faqFonts(canvaFaq);
        if (f) { applyFaqFonts(f); faqStyled = true; }
        else if (Date.now() - faqSince > FONT_WAIT) faqStyled = true;
      }
      if (!faqStyled) {
        /* Still waiting on Canva: keep its section drawn but unseen. */
        if (faq.nextElementSibling !== canvaFaq) canvaFaq.parentNode.insertBefore(faq, canvaFaq);
        canvaFaq.style.display = "";
        canvaFaq.classList.add("sjd-reading");
        size(faq);
      } else {
        mount(faq, canvaFaq);
      }
      if (details && details.style.backgroundImage && !faq.style.backgroundImage) faq.style.backgroundImage = details.style.backgroundImage;
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
  window.addEventListener("resize", function () { size(details); size(faq); });
  window.setInterval(sync, 800);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderDetails(nonce: string | null, sections: Record<string, string[]>): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${script(sections)}</script>\n`;
}
