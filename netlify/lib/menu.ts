/**
 * The phone menu: on a phone, every page's Canva nav row is replaced by a
 * menu button in the top-right corner that opens a dropdown of the same
 * links. The music button sits level with it in the top-left (player.ts).
 *
 * Both are fixed, so they stay in reach while a guest scrolls, and both sit
 * on a dark translucent disc so they read on photos and on the cream pages.
 *
 * The links are read from Canva's own nav on each page, so renaming a page in
 * Canva needs no change here:
 *  - the nav is the text level with Canva's page links (`a[href="#page-N"]`)
 *    in the page's first section - on a phone it wraps onto two rows;
 *  - on the main page that section is hidden behind the slideshow, which has
 *    already read the same nav and shares it as `window.__sjHeroNav`.
 * Canva's nav row is only hidden on phones, by class; desktop is untouched.
 *
 * Page changes go through Canva's own router (pushState + popstate), so the
 * music keeps playing - clicking Canva's hidden links only works in some of
 * its layouts. Not shown on the "/" cover, which has no nav.
 */
import { MOBILE } from "./player.ts";

/** Above the petals (2147481000) and the music button (2147482000); below
 *  the gallery lightbox (2147483000) and the RSVP modal (2147483100). */
const Z_INDEX = 2147482500;

const STYLES = `
  #sj-menu { display: none; }

  /* Desktop: the nav link under the mouse fades back (the couple's
     reference, 2026-10-04). Links only - the current page's own entry is
     plain text on some layouts. */
  @media (hover: hover) and (pointer: fine) {
    a.sj-canva-nav { transition: opacity 220ms ease; }
    a.sj-canva-nav:hover { opacity: 0.55; }
  }

  @media ${MOBILE} {
    #sj-menu:not(.sj-menu--off) { display: block; }
    /* Canva's own nav row, replaced by the menu on a phone. */
    .sj-canva-nav { visibility: hidden !important; }
  }

  #sj-menu-button {
    position: fixed;
    z-index: ${Z_INDEX};
    /* Level with the music button: its 48px box at 16px, this 44px one 2px lower. */
    top: calc(max(16px, env(safe-area-inset-top)) + 2px);
    right: max(16px, env(safe-area-inset-right));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 44px;
    height: 44px;
    margin: 0;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    background: rgba(30, 22, 26, 0.42);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    box-shadow: 0 4px 14px rgba(30, 22, 26, 0.18);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  #sj-menu-button span {
    display: block;
    width: 18px;
    height: 1.5px;
    border-radius: 1px;
    background: #fff;
    transition: transform 250ms ease, opacity 200ms ease;
  }
  /* The three lines fold into a cross while the menu is open. */
  #sj-menu.is-open #sj-menu-button span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
  #sj-menu.is-open #sj-menu-button span:nth-child(2) { opacity: 0; }
  #sj-menu.is-open #sj-menu-button span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }
  #sj-menu-button:focus-visible { outline: 1px solid #fff; outline-offset: 3px; }

  #sj-menu-list {
    position: fixed;
    z-index: ${Z_INDEX};
    top: calc(max(16px, env(safe-area-inset-top)) + 54px);
    right: max(16px, env(safe-area-inset-right));
    min-width: 184px;
    margin: 0;
    padding: 6px 0;
    list-style: none;
    background: rgba(28, 20, 24, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px);
    transition: opacity 200ms ease, transform 200ms ease, visibility 0s linear 200ms;
  }
  #sj-menu.is-open #sj-menu-list {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition: opacity 200ms ease, transform 200ms ease;
  }
  /* 12px, and in px: Canva's root font-size is 10px. The padding makes each
     line a comfortable tap target. */
  #sj-menu-list button {
    display: block;
    width: 100%;
    margin: 0;
    padding: 13px 26px;
    font-size: 12px;
    line-height: 1.5;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    text-align: left;
    white-space: nowrap;
    color: #fff;
    background: none;
    border: 0;
    opacity: 0.88;
    cursor: pointer;
    -webkit-font-smoothing: antialiased;
  }
  #sj-menu-list li + li button { border-top: 1px solid rgba(255, 255, 255, 0.1); }
  #sj-menu-list button[aria-current] { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    #sj-menu-button span, #sj-menu-list { transition: none; }
  }
`;

/** ES5 on purpose, like the other injected scripts. */
const script = (pages: Record<string, string>) => `
(function () {
  var PAGES = ${JSON.stringify(pages)};
  var FALLBACK_FONT = ${JSON.stringify('Georgia, "Times New Roman", serif')};

  var root = document.createElement("div");
  root.id = "sj-menu";
  root.className = "sj-menu--off";
  root.innerHTML =
    '<button id="sj-menu-button" type="button" aria-label="Menu" aria-controls="sj-menu-list" aria-expanded="false">' +
      "<span></span><span></span><span></span></button>" +
    '<ul id="sj-menu-list" aria-label="Pages"></ul>';
  var button = root.firstChild;
  var list = root.lastChild;
  var shown = ""; // the items currently in the list, to rebuild only on change

  /* "#page-2" -> "/details", from Canva's page order; null if unknown. */
  function pathFor(href) {
    var m = /^#page-(\\d+)$/.exec(href || "");
    var slug = m ? PAGES[Number(m[1])] : null;
    return slug == null ? null : "/" + slug;
  }

  /* The current page's own entry is plain text, not a link, on some Canva
     layouts; its link is the page Canva is showing. */
  function hrefForCurrent() {
    var slug = location.pathname.replace(/^\\/+|\\/+$/g, "");
    for (var n in PAGES) if (PAGES.hasOwnProperty(n) && PAGES[n] === slug) return "#page-" + n;
    return null;
  }

  function firstSection() {
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id !== "sj-hero" && sections[i].getElementsByTagName("a").length) return sections[i];
    }
    return null;
  }

  /**
   * The nav in the page's first section: text level with any page link, in
   * reading order (row by row, then left to right). Also tags those elements
   * so CSS can hide Canva's row on a phone. Null until it is all drawn.
   */
  function readNav(section) {
    var links = section.querySelectorAll('a[href^="#page-"]');
    if (!links.length) return null;
    var tops = [];
    for (var l = 0; l < links.length; l++) {
      var lr = links[l].getBoundingClientRect();
      if (!lr.width) return null;
      tops.push(lr.top);
    }
    /* Any row with a page link in it. Only the first section is searched, so
       a "read the story" link further down the page is never taken for nav;
       within it, the nav is not always at the top (the gallery's sits near
       the bottom of its first screen). */
    function navRow(top) {
      for (var i = 0; i < tops.length; i++) if (Math.abs(top - tops[i]) < 8) return true;
      return false;
    }
    var items = [], els = [];
    var walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      var text = n.nodeValue.replace(/\\s+/g, " ").trim();
      if (!text) continue;
      var el = n.parentElement;
      var r = el.getBoundingClientRect();
      if (!r.width || !navRow(r.top)) continue;
      var link = el.closest("a");
      items.push({ text: text, href: link ? link.getAttribute("href") : null, top: r.top, left: r.left, font: getComputedStyle(el).fontFamily });
      els.push(link || el);
    }
    if (items.length < 2) return null;
    for (var e = 0; e < els.length; e++) els[e].classList.add("sj-canva-nav");
    items.sort(function (a, b) { return Math.abs(a.top - b.top) < 8 ? a.left - b.left : a.top - b.top; });
    return items;
  }

  function render(items) {
    var key = location.pathname + "|" + items.map(function (i) { return i.text + i.href; }).join("|");
    if (key === shown) return;
    shown = key;
    list.innerHTML = "";
    for (var i = 0; i < items.length; i++) {
      var href = items[i].href || hrefForCurrent();
      if (!href) continue;
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = items[i].text;
      b.style.fontFamily = items[i].font + ", " + FALLBACK_FONT;
      b.setAttribute("data-href", href);
      if (pathFor(href) === location.pathname) b.setAttribute("aria-current", "page");
      li.appendChild(b);
      list.appendChild(li);
    }
  }

  function isOpen() { return root.classList.contains("is-open"); }
  function setOpen(open) {
    root.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  }

  function scroller() {
    var divs = document.querySelectorAll("div");
    for (var i = 0; i < divs.length; i++) {
      var oy = getComputedStyle(divs[i]).overflowY;
      if ((oy === "scroll" || oy === "auto") && divs[i].clientHeight && divs[i].scrollHeight > divs[i].clientHeight) return divs[i];
    }
    return null;
  }

  /* Through Canva's router, as the back button would; the current page just
     scrolls to the top. */
  function goTo(href) {
    var path = pathFor(href);
    if (path === null) return;
    if (path === location.pathname) {
      var s = scroller();
      if (s) s.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    /* With a "key", as Canva's own links push their entries: its router
       ignores an entry without one. */
    var state = { key: Math.random().toString(36).slice(2, 8) };
    history.pushState(state, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: state }));
  }

  function sync() {
    if (!document.body) return;
    if (root.parentNode !== document.body) document.body.appendChild(root);

    if (location.pathname === "/") {
      root.classList.add("sj-menu--off");
      setOpen(false);
      return;
    }

    /* The main page's slideshow, the full-screen openings and the RSVP page hide
       Canva's first section, so they share the nav they read there. */
    var items = null;
    var ownHero = document.getElementById("sj-hero") || document.getElementById("sj-shero") || document.getElementById("sj-rsvp-page");
    if (ownHero && ownHero.querySelector(".sj-hero-nav, .sj-shero-nav, .sjr-nav") && window.__sjHeroNav) items = window.__sjHeroNav;
    else {
      var section = firstSection();
      if (section) items = readNav(section);
    }
    /* No read yet (Canva still drawing): keep the last menu if there is one,
       since the links are the same on every page. */
    if (items && items.length) render(items);
    root.classList.toggle("sj-menu--off", !shown);
  }

  /* By position, not event.target: Canva swaps the element under the pointer
     between pointerdown and mouseup, so the click can land on <body>. */
  function buttonAt(x, y) {
    var candidates = [button].concat([].slice.call(list.querySelectorAll("button")));
    for (var i = 0; i < candidates.length; i++) {
      if (getComputedStyle(candidates[i]).visibility === "hidden") continue;
      var r = candidates[i].getBoundingClientRect();
      if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return candidates[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    if (root.classList.contains("sj-menu--off") || getComputedStyle(root).display === "none") return;
    var hit = buttonAt(e.clientX, e.clientY);
    if (!hit && e.detail === 0 && root.contains(e.target)) hit = e.target.closest("button");
    if (!hit) {
      /* A tap anywhere else closes the menu and carries on as normal. */
      if (isOpen()) setOpen(false);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (hit === button) { setOpen(!isOpen()); return; }
    setOpen(false);
    goTo(hit.getAttribute("data-href"));
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) { setOpen(false); button.focus(); }
  });

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
  window.addEventListener("popstate", function () { setOpen(false); sync(); });
  window.setInterval(sync, 700);
  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
})();
`;

export function renderMenu(nonce: string | null, pages: Record<string, string>): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<style${nonceAttr}>${STYLES}</style>\n<script${nonceAttr}>${script(pages)}</script>\n`;
}
