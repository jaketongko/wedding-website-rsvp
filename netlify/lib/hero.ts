/**
 * Makes the first section of the main invitation page fill the screen, so a
 * guest lands on the photo, names and date alone, with nothing of the next
 * section peeking in underneath.
 *
 * Canva gives every section a fixed px height (531px on a 390px phone, 802px
 * on desktop), and phones differ in height, so no height set in Canva can
 * fill every screen. The proxy grows the section to the screen at runtime.
 *
 * How Canva builds the hero (measured on the live page, 2026-10-04):
 *
 *   section                <- one per page section, stacked in normal flow
 *     div ... div          <- ~5 wrappers carrying the section height inline
 *       page div           <- inline height; every element inside is
 *                             absolutely positioned with an inline translate
 *         photo frame      <- wider than the screen, cropped by the wrappers
 *         nav, names, date, venue, an invisible centred frame
 *
 * So growing it is three moves, all in the page's own px:
 *  1. set every wrapper that carries the section height to the screen height
 *     (the sections below simply move down, being in normal flow),
 *  2. scale the photo up about the section centre so it still covers the
 *     taller box - object-fit: cover, done by hand,
 *  3. lift the content down by half the added height so it stays centred,
 *     except the nav, which stays at the top where Canva put it.
 *
 * Every change goes through put(), so it can be undone exactly, and sync()
 * redoes the whole thing whenever Canva overwrites one of them. Anything that
 * does not look like the structure above is left alone.
 */

/**
 * The main page's slug, as a prefix: the page was `/main` until Canva renamed
 * it `/main-2`, and a prefix survives that kind of rename.
 */
const ROUTE_PREFIX = "/main";

/**
 * ES5 on purpose, like the other injected scripts: it runs on whatever phone a
 * guest opens the invitation with, and there is no build step to transpile it.
 */
const SCRIPT = `
(function () {
  var ROUTE = ${JSON.stringify(ROUTE_PREFIX)};
  var POLL = 700;
  /* Content entirely within this top share of the hero is the nav: it stays
     put rather than being centred with the names. */
  var NAV_BAND = 0.22;
  /* Past this much growth the photo would be cropped to a sliver (a tall
     tablet, say); Canva's own layout is the better choice there. */
  var MAX_GROWTH = 2;

  var reflowed = []; // { el, prop, before, value } - every style we changed
  var applied = "";  // the route and screen size the current changes are for
  var observer = null;

  function onRoute() {
    return location.pathname.indexOf(ROUTE) === 0;
  }

  function put(el, prop, value) {
    var record = { el: el, prop: prop, before: el.style.getPropertyValue(prop) };
    el.style.setProperty(prop, value);
    /* Read back, so the comparison in flowIntact sees the browser's spelling. */
    record.value = el.style.getPropertyValue(prop);
    reflowed.push(record);
  }

  function unflow() {
    for (var i = reflowed.length - 1; i >= 0; i--) {
      var r = reflowed[i];
      /* A value Canva has since rewritten is Canva's again; leave it alone. */
      if (r.el.isConnected && r.el.style.getPropertyValue(r.prop) === r.value) {
        r.el.style.setProperty(r.prop, r.before);
      }
    }
    reflowed = [];
    applied = "";
  }

  function flowIntact() {
    for (var i = 0; i < reflowed.length; i++) {
      var r = reflowed[i];
      if (!r.el.isConnected || r.el.style.getPropertyValue(r.prop) !== r.value) return false;
    }
    return true;
  }

  function pxHeight(el) {
    var m = /^([0-9.]+)px$/.exec(el.style.height);
    return m ? parseFloat(m[1]) : NaN;
  }

  /* The first section of the page: the first <section> whose parent stacks
     several of them. */
  function heroSection() {
    var sections = document.getElementsByTagName("section");
    for (var i = 0; i < sections.length; i++) {
      var parent = sections[i].parentElement;
      if (parent && parent.getElementsByTagName("section").length > 1) {
        return parent.querySelector("section");
      }
    }
    return null;
  }

  /* Canva scrolls an inner div, not the document. */
  function scrollerOf(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === "scroll" || oy === "auto") && p.clientHeight) return p;
    }
    return null;
  }

  /**
   * The screen height to fill. The small viewport (svh) where the browser has
   * it, so the hero does not grow and shove the page about when a mobile URL
   * bar slides away; never taller than the box Canva actually scrolls.
   */
  var probe = null;
  function screenHeight(scroller) {
    var h = window.innerHeight;
    if (window.CSS && CSS.supports && CSS.supports("height", "100svh")) {
      if (!probe) {
        probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText =
          "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
      }
      /* Left mounted: adding and removing it each time would wake the
         MutationObserver below into a loop. */
      if (!probe.isConnected) document.body.appendChild(probe);
      h = probe.offsetHeight || h;
    }
    if (scroller) h = Math.min(h, scroller.clientHeight);
    return h;
  }

  /** True once the hero has been grown; false when there is nothing to do yet
   *  (Canva still rendering) or nothing to do at all (already screen-tall). */
  function grow() {
    var section = heroSection();
    if (!section || !section.offsetHeight) return false;

    var sr = section.getBoundingClientRect();
    var k = sr.height / section.offsetHeight;   // Canva's own page scale, if any
    var old = section.offsetHeight;
    var target = screenHeight(scrollerOf(section)) / k;
    var added = target - old;
    if (added < 1 || target / old > MAX_GROWTH) return false;

    function at(el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    }

    /* The wrappers sized to the section, and the page: the deepest of them,
       the one holding the positioned content. */
    var sized = [];
    var page = null;
    var all = section.querySelectorAll("[style]");
    for (var i = 0; i < all.length; i++) {
      if (Math.abs(pxHeight(all[i]) - old) < 2) {
        sized.push(all[i]);
        if (all[i].children.length > 1 && (!page || page.contains(all[i]))) page = all[i];
      }
    }
    if (!page) return false;

    /* The photo: the page child with an image that covers the whole section. */
    var photo = null;
    for (var c = 0; c < page.children.length; c++) {
      var child = page.children[c];
      var r = at(child);
      if (child.querySelector("img") && r.x <= 1 && r.y <= 1 &&
          r.x + r.w >= page.offsetWidth - 1 && r.y + r.h >= old - 1) {
        photo = child;
        break;
      }
    }
    if (!photo) return false;

    /* Measure everything before changing anything. */
    var p = at(photo);
    var canvaTransform = photo.style.transform;
    photo.style.transform = "none";
    var box = at(photo);
    photo.style.transform = canvaTransform;
    var moves = [];
    for (var m = 0; m < page.children.length; m++) {
      var el = page.children[m];
      if (el === photo || sized.indexOf(el) !== -1) continue;
      var er = at(el);
      if (er.y + er.h <= old * NAV_BAND) continue;     // the nav stays at the top
      moves.push(el);
    }

    /* 1. The section and its wrappers. */
    for (var s = 0; s < sized.length; s++) put(sized[s], "height", target.toFixed(2) + "px");

    /* 2. The photo, scaled about the section centre and re-centred in the
       taller box. Scaling by the growth makes it cover the new height exactly,
       as it covered the old; at 1x or more it still covers the width. */
    var scale = target / old;
    var cx = page.offsetWidth / 2;
    var x = cx + scale * (p.x - cx);
    var y = target / 2 + scale * (p.y - old / 2);
    put(photo, "transform-origin", "0 0");
    put(photo, "transform",
      "translate(" + (x - box.x).toFixed(2) + "px, " + (y - box.y).toFixed(2) + "px) scale(" +
      scale.toFixed(4) + ")");

    /* 3. The content, kept centred. */
    for (var n = 0; n < moves.length; n++) put(moves[n], "margin-top", (added / 2).toFixed(2) + "px");
    return true;
  }

  function sync() {
    if (!document.body) return;

    if (!onRoute()) {
      if (reflowed.length) unflow();
    } else {
      var key = location.pathname + " " + window.innerWidth + "x" + window.innerHeight;
      if (key !== applied || !flowIntact()) {
        /* Back to Canva's own layout first, so the measurements are of the
           real section rather than our version of it. */
        unflow();
        /* Only a successful grow is remembered: before Canva has rendered
           there is nothing to grow, and the next tick must try again. */
        if (grow()) applied = key;
      }
    }

    if (!observer && window.MutationObserver) {
      /* Canva's render churns the subtree hard, so the callback is coalesced to
         one sync per frame rather than one per mutation record. */
      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () { scheduled = false; sync(); });
  }

  if (document.body) sync();
  else document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("load", sync);
  window.addEventListener("resize", sync);
  /* Canva routes with pushState, which fires no event, so the route change is
     caught by the poll. Canva also finishes rendering long after load. */
  window.addEventListener("popstate", sync);
  window.setInterval(sync, POLL);
})();
`;

export function renderHero(nonce: string | null): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `\n<script${nonceAttr}>${SCRIPT}</script>\n`;
}
