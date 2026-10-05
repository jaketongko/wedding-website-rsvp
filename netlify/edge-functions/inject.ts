import type { Config, Context } from "@netlify/edge-functions";
import { renderHideCanvaFooter } from "../lib/canva-footer.ts";
import { renderDetails } from "../lib/details.ts";
import { renderGallery } from "../lib/gallery.ts";
import { renderGalleryPage } from "../lib/gallery-page.ts";
import { renderMenu } from "../lib/menu.ts";
import { findOpeningPhotos, renderOpening, renderOpeningPreload } from "../lib/opening.ts";
import { renderPetals } from "../lib/petals.ts";
import { renderPlayer } from "../lib/player.ts";
import { RSVP_FONTS, findLargestMedia, renderRsvp } from "../lib/rsvp.ts";
import { findPages, findSections, findSlides, renderSlideshow, renderSlideshowPreload } from "../lib/slideshow.ts";
import { renderStory } from "../lib/story.ts";

/**
 * Reverse-proxies the published Canva invitation and injects a background-music
 * player into the HTML on the way out.
 *
 * Canva sites cannot host audio and cannot be iframed (they send
 * `x-frame-options: SAMEORIGIN` and a `frame-ancestors` CSP), so proxying and
 * rewriting the HTML is the only way to add music while keeping the design
 * editable in Canva.
 */

const UPSTREAM = "https://shan-and-jake-wedding.my.canva.site";
const UPSTREAM_ORIGIN = new URL(UPSTREAM).origin;

/** Forwarded upstream so Cloudflare sees a browser-shaped request, not a bot. */
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "cookie",
  "user-agent",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "upgrade-insecure-requests",
];

/**
 * Body-framing and hop-by-hop headers. Deno's fetch decompresses transparently,
 * so passing the upstream values through would describe a body that no longer
 * exists and corrupt the response.
 */
const STRIPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
];

export default async function inject(request: Request, _context: Context): Promise<Response> {
  const incoming = new URL(request.url);

  // Dev aid: the RSVP form on its own, so it can be styled without waiting on
  // Canva's renderer (which can take well over a minute). Not linked anywhere.
  if (incoming.pathname === "/_preview-rsvp") {
    return new Response(renderRsvpPreview(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex",
        "cache-control": "no-store",
      },
    });
  }

  const upstreamUrl = new URL(incoming.pathname + incoming.search, UPSTREAM);

  const requestHeaders = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) requestHeaders.set(name, value);
  }
  // Canva resolves the site from the Host header; make sure it sees its own.
  requestHeaders.set("host", new URL(UPSTREAM).host);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });
  } catch (error) {
    console.error("[bgm] upstream fetch failed:", upstreamUrl.toString(), error);
    return new Response(
      "The invitation is temporarily unavailable. Please try again in a moment.",
      { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const name of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(name);

  // Keep guests on our origin when Canva redirects.
  const location = responseHeaders.get("location");
  if (location) responseHeaders.set("location", rewriteLocation(location, incoming.origin));

  const contentType = responseHeaders.get("content-type") ?? "";

  // Everything that is not a rendered page - images, fonts, scripts, JSON, and
  // Canva's own error pages - streams through untouched.
  if (!contentType.includes("text/html") || upstream.status !== 200) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  }

  const html = await upstream.text();

  /**
   * Canva's CSP uses `strict-dynamic` with a per-request nonce, so a script
   * carrying that same nonce is trusted. Reusing it lets the player run without
   * weakening Canva's XSS protections.
   */
  const nonce = readScriptNonce(responseHeaders.get("content-security-policy"));
  if (!nonce) {
    console.warn(
      "[bgm] No CSP nonce found upstream - dropping the CSP so the player can run. " +
        "Canva's markup has probably changed; re-check this after any redesign.",
    );
    responseHeaders.delete("content-security-policy");
  }

  // The nonce is per-request, and caching would also hide fresh Canva edits.
  responseHeaders.set("cache-control", "no-store");

  /**
   * All of these go on EVERY page, not just /rsvp.
   *
   * Canva navigates between pages client-side, so arriving at /rsvp from the
   * invitation fires no new document load. Gating the RSVP code on the initial
   * pathname meant it was absent on exactly that route, and Canva's broken
   * widget showed through. The script scopes itself to /rsvp at runtime instead.
   */
  // Every page's data is in every page's HTML, so the slideshow photos can be
  // read here even when the guest lands on the cover.
  const slides = findSlides(html);
  const pages = findPages(html);
  const sections = findSections(html);
  const openingPhotos = findOpeningPhotos(html);
  const media = findLargestMedia(html);
  const injected =
    renderPlayer(nonce) +
    renderRsvp(nonce, pages, sections, media) +
    renderHideCanvaFooter(nonce) +
    renderPetals(nonce) +
    renderGallery(nonce) +
    renderGalleryPage(nonce, sections, media) +
    renderSlideshow(nonce, slides, pages, sections) +
    renderOpening(nonce, openingPhotos, pages, sections) +
    renderStory(nonce, sections) +
    renderDetails(nonce, sections, media) +
    renderMenu(nonce, pages);

  // In <head>, so the RSVP fonts and the first photo download with the HTML rather
  // than seconds later, when Canva's JS gets round to rendering the page.
  const preload =
    RSVP_FONTS +
    renderSlideshowPreload(slides, incoming.pathname) +
    renderOpeningPreload(openingPhotos, incoming.pathname);
  const page = preload ? insertBeforeHeadClose(html, preload) : html;

  return new Response(insertBeforeBodyClose(page, injected), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const config: Config = {
  path: "/*",
  // Served by Netlify itself, never proxied to Canva: /_wedding/* is the audio,
  // /_forms/* is the RSVP endpoint and must reach Netlify's form handler.
  excludedPath: ["/_wedding/*", "/_forms/*"],
};

/**
 * Standalone RSVP form for design work.
 *
 * There is no Canva section to read here, so the script builds the page with
 * plain defaults (no nav, no envelope).
 */
function renderRsvpPreview(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RSVP preview</title>
${RSVP_FONTS}
<style>
  body { margin: 0; background: #f6f3f7; }
</style>
</head>
<body>
${renderRsvp(null)}
</body>
</html>`;
}

function readScriptNonce(csp: string | null): string | null {
  if (!csp) return null;
  const match = csp.match(/'nonce-([A-Za-z0-9+/=_-]+)'/);
  return match ? match[1] : null;
}

function rewriteLocation(location: string, selfOrigin: string): string {
  try {
    const target = new URL(location, UPSTREAM);
    if (target.origin !== UPSTREAM_ORIGIN) return location;
    return selfOrigin + target.pathname + target.search + target.hash;
  } catch {
    return location;
  }
}

function insertBeforeHeadClose(html: string, markup: string): string {
  const index = html.indexOf("</head>");
  if (index === -1) return html;
  return html.slice(0, index) + markup + html.slice(index);
}

function insertBeforeBodyClose(html: string, markup: string): string {
  const index = html.lastIndexOf("</body>");
  if (index === -1) return html + markup;
  return html.slice(0, index) + markup + html.slice(index);
}

