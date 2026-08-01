# Our Voice

A free, offline-first AAC (augmentative and alternative communication) web app,
built for a family: two kids with different communication styles, one mom who
maintains both boards from her phone, zero budget, and no dependence on
App Stores, licenses, or state funding decisions.

No build step, no server, no accounts. Plain HTML/CSS/JS, installable as a PWA
on iPhone, iPad, Android, or any browser.

## Features (v1)

- **Two board styles per profile:**
  - *Simple* - tap a button, the device speaks it right away (SoundingBoard-style).
  - *Sentence bar* - taps build a sentence at the top; tap the bar to speak it
    (TD Snap-style).
- **Text-to-speech by default** using the device's built-in voices (offline, free).
  Voice and speed are per-profile.
- **Board folders** - buttons can open other boards (Food, Feelings, ...).
- **Edit mode for grown-ups** (hold the gear ~1 second): add/edit/delete/move
  buttons, resize grids, add boards and profiles.
- **Three picture sources:** emoji (works offline instantly), your own photos
  (resized and stored on-device), and ARASAAC symbol search (downloads the
  symbol so it works offline afterwards).
- **Color coding** with a modified-Fitzgerald starter palette.
- **Offline-first:** after the first visit everything runs with no internet.
- **Backup/restore** - one JSON file containing all profiles, boards, and photos.
  Save it anywhere; restore onto any other device.

## Run it locally

Any static file server works:

```bash
python3 -m http.server 8317
# open http://localhost:8317
```

## Put it on the internet (free)

Push this folder to a GitHub repository, then enable **Settings → Pages →
Deploy from branch**. The app will be at `https://<user>.github.io/<repo>/`.
(Cloudflare Pages / Netlify free tiers work the same way - it is just static
files.) HTTPS is required for the service worker, and both provide it.

**When you deploy an update,** bump `VERSION` in `sw.js` so installed devices
pick up the new files.

## Install on the kids' devices

- **iPhone / iPad:** open the URL in Safari → Share → **Add to Home Screen**.
  It gets a real icon, opens full screen, and works offline.
  Tip: use iOS **Guided Access** (Settings → Accessibility) to lock the device
  into the app during use.
- **Android:** open in Chrome → menu → **Add to Home screen** (or "Install app").

## Development

```bash
node --test tests/model.test.mjs   # pure-logic tests (grid math, OBF export)
node tools/make-icons.mjs          # regenerate icons/ (no dependencies)
```

Board data is modeled on the [Open Board Format](https://www.openboardformat.org/)
(`js/model.js` includes an OBF exporter); `.obf`/`.obz` file import/export is a
planned milestone, as are cross-device sync, switch scanning, and an
AUMI-inspired music/play board.

## Licenses & attribution

- Symbols searched in the editor come from [ARASAAC](https://arasaac.org)
  (CC BY-NC-SA, Government of Aragon, Spain) and are for personal,
  non-commercial use.
- Emoji render from the device's own emoji font.
- Speech uses the Web Speech API (the device's built-in voices).
