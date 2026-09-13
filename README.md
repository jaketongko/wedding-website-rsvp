# Shan & Jake — invitation with background music

Adds background music to the Canva invitation at
<https://shan-and-jake-wedding.my.canva.site/> without changing anything in Canva.

Netlify serves your domain and reverse-proxies every request to the Canva site. A Netlify Edge
Function rewrites the HTML on the way out, adding a looping audio track and a small mute toggle.
The invitation itself is the first and only thing a guest sees — there is no splash or click-gate.

### How the music starts without a gate

Browsers block autoplay-with-sound until the page has been interacted with. There is no way around
that, on any host. So playback is attempted in three stages:

1. **Play unmuted.** Succeeds for guests whose browser already trusts the site — Chrome's Media
   Engagement Index, or a returning visitor.
2. **If refused, play muted.** Muted autoplay is always permitted, so the track is already rolling
   and in sync.
3. **Unmute on first interaction.** Any `pointerdown`, `touchstart`, `mousedown`, `click`, or
   `keydown` swaps the sound in, fading volume up over 1.2s so it never blasts.

Scrolling is deliberately *not* a trigger — browsers do not count it as a user activation gesture,
so unmuting on scroll would silently fail.

A guest who previously hit mute stays muted: the choice is stored in `localStorage` and respected
on the next visit rather than being overridden by the autoplay logic.

**Keep editing the invitation in Canva.** Changes appear through the proxy immediately; nothing
here needs redeploying for a content change.

## Why a proxy and not a copy

- Canva has no HTML export.
- Canva Sites ignore audio tracks when published as a website.
- The published site sends `x-frame-options: SAMEORIGIN` and a `frame-ancestors` CSP, so it
  cannot be embedded in an `<iframe>` on another domain.

## Adding your music

Drop the track in as `public/_wedding/bgm.mp3` and deploy. Nothing else to change.

```
public/_wedding/bgm.mp3    <- your track (preferred)
public/_wedding/bgm.wav    <- generated placeholder fallback, safe to delete
source-audio/              <- raw originals, gitignored and never deployed
```

The current track was extracted from an MP4 that also carried a 720p H.264 video stream — 9.9 MB
of video nobody would ever see. `ffmpeg-static` is a dev dependency for this; to redo it:

```bash
node_modules/ffmpeg-static/ffmpeg.exe -y -i "source-audio/YOUR FILE.mp4" \
  -vn -c:a libmp3lame -b:a 128k -ar 44100 -ac 2 -map_metadata -1 public/_wedding/bgm.mp3
```

Keep raw source files in `source-audio/`, never in `public/` — anything under `public/` is
published and publicly downloadable.

The player asks for `bgm.mp3` first and falls back to `bgm.wav`. It picks the first file that
actually exists with a `HEAD` request — a `<source>` list cannot do this, because when the first
entry 404s the audio element sits at `readyState 0` forever without firing `error`.

Track guidance: MP3, 128 kbps, ~2–4 MB. Anything larger punishes guests on mobile data. Use music
you own or that is royalty-free — this page is public to anyone with the link.

## Local development

```bash
npm install
npm run dev          # http://localhost:8888
```

Two local-only quirks, neither of which affects production:

- `netlify dev`'s static server **ignores HTTP Range requests** (returns `200`, no
  `Accept-Ranges`). Chrome's media loader can stall on that. Netlify's CDN handles ranges
  correctly, so test audio on a deploy preview rather than locally.
- `netlify dev` does **not** watch files imported from outside `netlify/edge-functions/`. After
  editing `netlify/lib/player.ts`, touch the entry point to force a rebuild:
  ```bash
  touch netlify/edge-functions/inject.ts
  ```

## Deploying

Live at **<https://shan-and-jake-wedding-invitation.netlify.app>** (site ID
`78a72add-74f1-473e-828b-459ad302ae77`). The site was renamed from `shan-and-jake` on
2026-09-13; Netlify does not redirect an old subdomain, so `shan-and-jake.netlify.app` now 404s.

```bash
npm run deploy          # production
npm run deploy:preview  # draft URL
```

Share the Netlify URL with guests. The original `my.canva.site` link keeps working — it just has
no music.

### Two things that cost an hour the first time

**`--build` is mandatory.** A plain `netlify deploy --prod` uploads the publish directory but
**silently skips edge-function bundling** — the site then returns 404 on `/` because nothing is
proxying to Canva. Both npm scripts pass `--build`; do not remove it. A successful deploy prints
`Packaging Edge Functions from netlify\edge-functions directory`. If you do not see that line, the
proxy did not ship.

**Site-level SSO was disabled to make the site public.** This team defaults new sites to
`sso_login: true` for all contexts, which returns `401` to everyone — production included, not
just draft URLs. It was turned off for this site only; the team-wide default was left alone. To
re-protect the site:

```bash
npx netlify api updateSite --data '{"site_id":"78a72add-74f1-473e-828b-459ad302ae77","body":{"sso_login":true}}'
```

## RSVP

Canva's form widget **cannot** be shown on this domain. `/_website-element-widget` redirects to
`https://www.canva.com/_website-element-widget`, which answers with:

```
x-frame-options : deny
frame-ancestors : 'self' https://shan-and-jake-wedding.my.canva.site …
```

Canva server-side allowlists the canva.site domain by name. Framed from anywhere else the browser
refuses outright — that is the "www.canva.com refused to connect" box. No proxy setting fixes it.

So `netlify/lib/rsvp.ts` replaces that widget with our own form, submitting to **Netlify Forms**.
Submissions appear under Forms → `rsvp` in the Netlify dashboard.

The countdown-timer embed on the same page has no framing restrictions and works untouched.

### Wiring you must not break

**`public/_forms/rsvp.html` is load-bearing.** Netlify discovers forms by scanning static HTML at
deploy time. Our real form is injected at runtime into a proxied page, so it is invisible to that
scan. Without this file every submission is rejected with "form not found". **Its field names must
stay in sync with the injected form** or values are silently dropped.

**`/_forms/*` is in the edge function's `excludedPath`.** Otherwise the POST is proxied to Canva
instead of reaching Netlify's form handler.

**Form detection had to be switched on.** New sites on this team ship with
`processing_settings.ignore_html_forms: true`, which silently registers nothing. It was disabled
for this site:

```bash
npx netlify api updateSite --data '{"site_id":"78a72add-74f1-473e-828b-459ad302ae77","body":{"processing_settings":{"html":{"pretty_urls":true},"ignore_html_forms":false}}}'
```

**The form re-mounts itself forever.** Canva's renderer is slow — on a throttled browser the
widget took ~100 seconds to appear — and it detaches injected nodes on every re-render. The
observer therefore has **no timeout** and re-swaps a lost form. An earlier 30-second window would
have dropped the form entirely on a slow phone.

**There is a fallback.** If no widget appears within 12 seconds, a floating RSVP button opens the
same form in a modal, so there is always a way to respond even if Canva renders nothing or changes
the widget URL. It removes itself if the real widget turns up later.

### Changing the fields

Edit both `netlify/lib/rsvp.ts` (the visible form) and `public/_forms/rsvp.html` (the
registration), then redeploy. Current fields:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Full name |
| `attending` | yes | `yes` / `no` |
| `dietary` | yes, when attending | Hidden and not enforced for a decline |
| `message` | no | |
| `bot-field` | — | Honeypot, ignored |

### Layout rules worth keeping

**The panel is `position: fixed` and mounted on `<body>`, not where the widget sat.** Canva
transforms its layout containers, and a transformed ancestor makes `fixed` resolve against that
ancestor instead of the viewport. Leaving the panel in place mis-positions and mis-sizes it. The
widget is swapped for an inert placeholder of the same size so Canva's layout is undisturbed.

**Nothing may stick out past the card.** The floral sprays sit flush in the top-right and
bottom-left corners with no negative insets and no `translate`. Both negative insets *and*
transforms count as scrollable overflow, which reintroduces the scrollbar and lets the card get
nudged when a field takes focus. The card is `overflow: hidden`; the scroller is `.sj-card-inner`.

Those two corners are chosen because the heading occupies top-left and Submit sits bottom-right.

**Never grow `<body>` or `<html>` to make room for the card.** Canva scrolls the page inside its own
container (`overflow-y: scroll`), not the document, so the document is always exactly one viewport
tall. An earlier version saw that as "page too short", set `body { min-height }`, and made the
document scroll too: two scrollbars side by side. `ensureVisible` now only grows the page when no
ancestor scrolls, and its un-clip loop stops at a scroll container so it cannot disable Canva's.

### The details card

A second card beside the form shows the title, date, location and attire. Its wording lives in
`INFO_TITLE` / `INFO_ITEMS` in `rsvp.ts` and was **copied from the Canva Details page**; when the
couple edits that page, update these too.

When both cards fit side by side (the details card at least 280px wide, roughly windows 850px and
wider), the form is shifted (`left` on `#sj-rsvp`) so the pair is centred on the page. Otherwise the
details card is hidden and the form stays exactly where Canva placed it. It is deliberately **never stacked below the form**: Canva gives
each page a fixed height inside `overflow: hidden` frames, so anything past the bottom is cut off
and cannot be scrolled to (measured on a phone). Showing it on phones needs a taller RSVP page in
Canva first.

The monogram above the details is `public/_wedding/logo-mark.png`: the original logo cropped to its
edges and resized to 390x480 (59 KB, from a 6250px, 2.7 MB original), shown at 98x120, so the
file still covers 3x screens. It is used only as a CSS
mask, so its colour comes from `--sj-accent` in `rsvp.ts`, not from the file. `/_wedding/*` is cached
`immutable` for a week, so a replacement logo must use a new filename.

Canva repositions the form *after* the resize event, so the card is re-placed 200ms and 1s after
each resize and whenever the form's box changes. Automated tabs report `document.hidden` and Chrome
pauses their timers and Canva's layout code, so test resizing with fresh loads at each width.

### The font

The form uses **The Seasons**, the invitation's own typeface. It is not self-hosted: `rsvp.ts`
points `@font-face` at the `.woff` files Canva already serves for the design
(`/_assets/fonts/<hash>.woff`, same-origin through the proxy). The hashes were read from Canva's page
data (search the page HTML for `"C":"The Seasons"`). If the couple removes the font from the Canva
design, those files go away and the form falls back to Georgia; re-read the hashes if that happens.

**Font sizes are in px, spacing stays in rem.** Canva sets `html { font-size: 10px }`, so every
`rem` in the form is 62.5% of what it would be elsewhere. Text is sized in px so it reads the same
everywhere. Inputs are 16px, the minimum that stops iOS zooming on focus. Spacing was deliberately left in rem:
scaling it too would make the cards about 60% taller, and Canva cuts off anything past its fixed
page height. With px text the cards are about 730px tall and still end ~125px above the cutoff
(checked at 390, 1366x768 and 2000px). Measure on a real Canva page; `/_preview-rsvp` has a 16px
root and shows spacing larger than it really is.

Interpolate the font stack into the CSS raw. An earlier `JSON.stringify` wrapped the whole stack in
one pair of quotes, which CSS reads as a single nonexistent family, and every guest saw the browser
default font instead.

### Previewing the design

Canva's renderer can take over a minute, which makes styling the form painful. Open
**`/_preview-rsvp`** for the form on its own, rendered through exactly the same code path (a stub
iframe carries the widget marker so the normal swap runs). It is `noindex` and linked from
nowhere.

## How it works

| File | Role |
|---|---|
| `netlify/edge-functions/inject.ts` | Proxies to Canva, rewrites HTML, handles headers |
| `netlify/lib/player.ts` | The injected audio element and mute toggle |
| `netlify/lib/rsvp.ts` | The injected RSVP form that replaces Canva's blocked widget |
| `netlify/lib/canva-footer.ts` | Hides Canva's bottom bar (Terms & Support / Privacy Policy / Designed with Canva) |
| `public/_forms/rsvp.html` | Registers the form with Netlify at deploy time |
| `netlify.toml` | Static publish dir and asset caching |

### Things that will bite you if you change them

**The CSP nonce.** Canva's CSP is `script-src 'strict-dynamic' 'nonce-<uuid>' …`. The proxy parses
that per-request nonce and stamps it on the injected `<script>`, so the player runs *without*
weakening Canva's XSS protection. If Canva ever stops sending a nonce, the function logs a warning
and drops the CSP as a fallback. Watch for that warning after any Canva redesign.

**Canva re-renders the page body after hydration.** It detaches and re-parents injected nodes,
which is why the player builds its DOM in JS, keeps stable node references, and re-mounts itself
from a `MutationObserver`. Re-appending the same node objects preserves their event listeners.

**Gesture listeners live on `document` in the capture phase.** Canva's re-render can swap the
element under the cursor between `pointerdown` and `mouseup`, which makes the browser fire `click`
on `<body>` instead of the element you expect. Hit-testing a specific node therefore misses real
taps — listen on `document` and do not depend on `event.target`.

**`audio.play()` is wrapped in try/catch and its promise is always handled.** Some browsers throw
synchronously instead of returning a rejected promise. An unhandled failure here must never break
the page: music is optional, the invitation is not.

**Unmuting must happen inside the gesture handler.** iOS Safari only honours the user gesture on
the synchronous path. Do not `await` anything before calling `play()` or clearing `muted`.

**HTML responses are `no-store`.** The CSP nonce is per-request, and caching would also hide fresh
Canva edits.

## Not yet verified

Audible playback and real pointer input were never confirmed end to end — the automated browser
used during development has no working audio decoder (even a tiny inline data-URI WAV stalls at
`readyState 0`) and its synthetic clicks do not reach the page's main world. The player's logic
was verified by dispatching DOM events directly.

Before sending the link to guests, check by hand on a real device:

1. The invitation loads directly, with no splash screen.
2. Music starts on its own, or at your first tap anywhere on the page.
3. The volume fades in rather than starting at full.
4. The mute toggle works, and the choice survives a reload.
5. Repeat on a real iPhone (Safari) and a real Android (Chrome) — autoplay and gesture rules
   differ from desktop, and an emulator will not catch the difference.
