# Our Voice

A free, offline-first AAC (augmentative and alternative communication) web app,
built for a family: two kids with different communication styles, one mom who
maintains both boards from her phone, zero budget, and no dependence on
App Stores, licenses, or state funding decisions.

No build step, no server, no accounts. Plain HTML/CSS/JS, installable as a PWA
on iPhone, iPad, Android, or any browser.

## Features

- **Two board styles per profile:**
  - *Simple* - tap a button, the device speaks it right away (SoundingBoard-style).
  - *Sentence bar* - taps build a sentence at the top; tap the bar to speak it
    (TD Snap-style).
- **Text-to-speech by default** using the device's built-in voices (offline, free).
  Voice and speed are per-profile.
- **Recorded voice (optional)** - record a real voice on any button; it plays
  instead of the robot voice. Great for "I love you" in Mom's voice.
- **Music board** - AUMI-inspired pentatonic pads (plus drum and chime). Any
  combination sounds musical: no wrong notes, pure cause-and-effect joy.
- **Template board library** - Feelings, Food, People, Body & Hurt, School,
  Weather, Music. Add one to any profile from Board settings; a link button is
  placed automatically.
- **Word Finder** - search every board for a word; results show the tap path
  ("Home > food > cookie"), and tapping jumps there and highlights the button.
- **Type-to-talk keyboard with prediction** - a typing view whose word
  suggestions rank the child's own board vocabulary and past speech first.
- **Vocabulary masking** - hide any button for teaching; it keeps its grid spot
  (motor plan preserved) and reappears with one checkbox.
- **Hold-to-activate** - per-profile dwell time (0.3-1s) so brushes and
  accidental touches don't trigger speech.
- **Usage log for SLPs** - what was said and when, stored on-device only,
  exportable as CSV from the Grown-ups screen.
- **Undo** - one tap reverses the last edit (up to 25 steps per session).
- **Board folders** - buttons can open other boards.
- **Per-person size setting** - Standard / Large / Extra-large scales the
  sentence-bar controls, navigation buttons, and labels per profile.
- **Edit mode for grown-ups** (hold the gear ~1 second): add/edit/delete/move
  buttons, resize grids, add boards and profiles.
- **Three picture sources:** emoji (works offline instantly), your own photos
  (resized and stored on-device), and ARASAAC symbol search (downloads the
  symbol so it works offline afterwards).
- **Color coding** with a modified-Fitzgerald starter palette.
- **Offline-first:** after the first visit everything runs with no internet.
- **Backup, restore & share** - everything (profiles, boards, photos,
  recordings) in one JSON file. Save it, or send it straight to another device
  with the system share sheet (AirDrop, Messages, email) and Restore there.

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
planned milestone, as are automatic cross-device sync (needs a small backend)
and switch-scanning access.

Note: recordings are stored in the browser's native format (AAC on iOS,
WebM on Android/Chrome). A recording made on one platform may not play on the
other - record on the device the child uses, or use share/restore between
same-platform devices.

## Licenses & attribution

- Symbols searched in the editor come from [ARASAAC](https://arasaac.org)
  (CC BY-NC-SA, Government of Aragon, Spain) and are for personal,
  non-commercial use.
- Emoji render from the device's own emoji font.
- Speech uses the Web Speech API (the device's built-in voices).
