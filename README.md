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

**There is a fallback.** If Canva has not drawn the RSVP page within 12 seconds, a floating RSVP
button opens the same form in a modal, so there is always a way to respond.

### Changing the fields

Edit both `netlify/lib/rsvp.ts` (the visible form) and `public/_forms/rsvp.html` (the
registration), then redeploy. Current fields:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Full name |
| `attending` | yes | `yes` / `no` |
| `dietary` | yes, when attending | Not enforced for a decline |
| `message` | no | |
| `bot-field` | — | Honeypot, ignored |

### The page

`rsvp.ts` builds the whole RSVP page as one section of ours (`#sj-rsvp-page`), in lavender:

- the nav (desktop; the phone menu stands in on phones, fed by `window.__sjHeroNav`);
- a centred opening: "Please RSVP" and the envelope, with the reply-by date (`REPLY_BY`) and
  "Please let us know..." in a bubble beneath it;
- "Things to know" (`REMINDERS`: save the date, let us know, dress code, the venue) beside the form,
  stacked on narrow screens.

**What comes from Canva:** the nav, the "Please" / "RSVP" title (its two largest lines, with their
fonts and colours), the envelope (every image that is not the page background, cropped the way
Canva crops it) and the paper background. Canva's section is hidden by id from the first moment on
the route, read once its text and images have settled, then set to `display: none`. Edit those in
Canva as usual. **What is ours:** the reply-by bubble, the reminders and the form
wording; edit them in `rsvp.ts`. The reminders repeat the Details page, so update them together.

Text is sized in `em` from a 16px base on the section (Canva's root is 10px). The envelope art is
capped at `ART_MAX` (17em) tall: Canva's phone layout of it is a tall stem.

### The fonts

The RSVP page uses two faces from Google Fonts: **Playfair Display** for reminder titles, the
date and the button, and **Lato** for everything read (descriptions, labels, fields). The headings
("Things to know", "Will you celebrate with us?", "Thank you") use **Marcellus**, the face of the
page titles in Canva, and the two answers use **The Seasons**, the invitation's own face; both come
from the `/_assets/fonts` files Canva serves. `RSVP_FONTS`
is put in `<head>` on every page, since a guest can reach /rsvp without a page load. Canva's CSP
restricts only scripts and framing, so the stylesheet loads; if that ever changes, the stacks fall
back to Georgia / Helvetica.

**The Seasons**, the invitation's own typeface, is still registered here for the rest of the site
(`FONT`: the gallery lightbox, and the fallback in the slideshow and full-screen openings). It is not self-hosted: `rsvp.ts`
points `@font-face` at the `.woff` files Canva already serves for the design
(`/_assets/fonts/<hash>.woff`, same-origin through the proxy). The hashes were read from Canva's page
data (search the page HTML for `"C":"The Seasons"`). If the couple removes the font from the Canva
design, those files go away and the form falls back to Georgia; re-read the hashes if that happens.

Interpolate the font stack into the CSS raw. An earlier `JSON.stringify` wrapped the whole stack in
one pair of quotes, which CSS reads as a single nonexistent family, and every guest saw the browser
default font instead.

### Previewing the design

Canva's renderer can take over a minute. **`/_preview-rsvp`** shows the page on its own with plain
defaults (no nav, no envelope). It is `noindex` and linked from nowhere.

## How it works

| File | Role |
|---|---|
| `netlify/edge-functions/inject.ts` | Proxies to Canva, rewrites HTML, handles headers |
| `netlify/lib/player.ts` | The injected audio element and mute toggle |
| `netlify/lib/rsvp.ts` | The RSVP page: envelope, reply-by date, reminders and the form (replaces Canva's blocked widget) |
| `netlify/lib/canva-footer.ts` | Hides Canva's bottom bar (Terms & Support / Privacy Policy / Designed with Canva) |
| `netlify/lib/petals.ts` | Lavender petals drifting over every page from `/main` on, not the `/` cover (pointer-events none, off under reduced motion) |
| `netlify/lib/gallery.ts` | Hover treatment on the `/gallery` photos, and the lightbox they open with previous/next |
| `netlify/lib/slideshow.ts` | Full-screen photo slideshow in place of `/main`'s first section; photos come from the Gallery page's grid, text and fonts from Canva's own hero. On phones its nav row gives way to the menu below |
| `netlify/lib/opening.ts` | `/our-story`, `/details`, `/gallery`: the first section becomes a full-screen opening (Canva's photo, the nav, the lines rising in). Canva's section is held invisible at full-screen height from the start, so nothing below moves |
| `netlify/lib/story.ts` | `/our-story`: the story section re-set as minimal lavender cards with a photo carousel per event, the quotes open above them; text and fonts read from Canva, photos from `story-photos.generated.ts` (see "Our Story photos") |
| `scripts/story-photos.mjs` | The build step: resizes `source-images/our-story/<event>/*` into `public/_wedding/our-story/` and writes `netlify/lib/story-photos.generated.ts` |
| `netlify/lib/menu.ts` | Phones: every page's Canva nav row becomes a fixed menu button (top right) with a dropdown; the music button sits level with it, top left. Links map `#page-N` by each page's `"P"` number in Canva's data |
| `netlify/lib/details.ts` | `/details`: each category as a bubble card (timeline, venue + Google Maps, dress code, reminders) and the FAQ as an accordion. See below |
| `public/_forms/rsvp.html` | Registers the form with Netlify at deploy time |
| `netlify.toml` | Static publish dir, the photo build step, and asset caching |

### Our Story photos

Each story card on `/our-story` shows the photos in its event's folder, in the **main**
checkout (`C:\Workspaces\wedding-website-rsvp`), even when deploying from a linked worktree -
the script finds the main checkout through git:

```
source-images/our-story/thefirsthello/
source-images/our-story/usalongtheway/
source-images/our-story/thequestion/
```

The folder name is the card's title with only letters and digits, lower-cased, so a new
event titled "THE BIG DAY" in Canva reads from `thebigday/`. Photos show in file-name order
(`01.jpg`, `02.jpg`, ...); JPEG, PNG and WebP are accepted. An event with no folder keeps its
one photo from Canva. The originals are not committed (`source-images/` is ignored).

Every `netlify deploy --build` resizes them (1600px long edge, metadata and location
stripped, phone rotation applied) into `public/_wedding/our-story/` under content-hash names,
so a replaced photo is never served stale from the week-long immutable cache. Run
`npm run photos` to do that step alone; commit the resized copies and
`netlify/lib/story-photos.generated.ts` it writes.

### The Details page

`details.ts` puts two sections of ours in front of Canva's details and FAQ sections.

**Read from Canva** (edit in Canva as usual): the intro lines, the lake painting, the venue
photo and its lines, every FAQ question and answer (a line ending in `?` starts a question),
the paper and the fonts.

**In `details.ts`**, because in Canva they are painted into images that are unreadable on a
phone: `CELEBRATION` (the timeline), `DRESS`, `THINGS` (the reminders; the RSVP date comes
from `REPLY_BY` in `rsvp.ts`) and `MAP_URL`. If the couple changes those strips in Canva,
update these. Their artwork was cut out of Canva's images once, with the paper made
transparent, into `public/_wedding/details/*.webp`.

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

**A Canva photo is bigger than the tile you see.** Canva puts the whole image in an absolutely
positioned `<img>` (with `pointer-events: none`) inside an `overflow: hidden` frame, and the frame
does the cropping. So the gallery's hover lives on the frame, the zoom scales the `img` inside it,
and the lightbox costs no extra download — `img.src` is already the full-size photo. `gallery.ts`
tells the tiles apart from the page's background artwork by size: a frame at least 90% of the
viewport wide *and* 60% of it tall is backdrop, not a photo.

**Do not reveal an overlay from `requestAnimationFrame`.** A tab that is not visible never runs
one, so the element stays at `opacity: 0` while still covering — and swallowing clicks on — the
page. Force a style flush (`void el.offsetWidth`) and add the class in the same tick instead.

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
