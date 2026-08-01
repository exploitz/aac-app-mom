# AAC Landscape Research — aac-app-mom

*Researched 2026-07-31. Context: two siblings with Down syndrome, each using a different
AAC system. Mom maintains both and has to fight the state for funded iPads. Goal: a
family-controlled app that mimics what she already knows, runs on anything, and never
depends on a funding decision.*

## The two systems mom actually knows

These define what "mimic" means. They are very different models:

### AbleNet SoundingBoard (sibling A)
- Free iOS app. Boards with **up to 20 message locations** per page.
- Cells use **AbleNet symbols or your own photos**.
- **Recorded speech** — mom records her voice per button (no text-to-speech).
- Boards can **link to other boards** (tap "food" → opens food board).
- **Switch scanning** via Bluetooth switch (AbleNet Blue2, which presents as a keyboard).

### TD Snap (sibling B)
- Tobii Dynavox, ~$50 one-time. iPad + Windows; also preloaded on Tobii dedicated devices.
- **Symbol grid page sets** with text-to-speech, sentence bar, page navigation.
- Ships with **Core First** (core-word) and **Motor Plan** (motor-planning) page sets.
- Uses the proprietary **PCS symbol set** (cannot be copied into a custom app).
- Chosen when a path to an insurance-funded dedicated Tobii device matters.

### Mom's feedback (2026-07-31)

- **No required voice recording.** SoundingBoard's record-every-button workflow is a
  chore — text-to-speech should be the default everywhere. Type the word, the device
  speaks it. Recording becomes an optional per-button override (e.g. a family member's
  voice for "I love you"), never a prerequisite.
- **She loved AUMI** (Adaptive Use Musical Instruments, aumiapp.com — free, from the
  Deep Listening Institute). It turns any movement or touch into music via the camera,
  built for people with very limited motor control, with an explicit "improvisation,
  not right notes" philosophy. Design lessons to steal: every interaction produces an
  instant, rewarding response; there are no wrong answers; it meets each kid's motor
  ability where it is; play is a reason to pick the device up at all.
- **Budget is the constraint.** The whole stack must be $0 (see Recommendation).

**Design implication:** one app, two profiles, two board styles — a simple
photo-grid (SoundingBoard-style layout, but TTS-voiced) and a symbol + TTS grid with a
sentence bar (Snap-style). Per-profile grid size, because their access needs differ.
AAC users build motor memory for word positions — layouts must be able to replicate the
kids' current page layouts cell-for-cell, and never reflow on their own.

## Commercial market (what's available)

| App | Price | Platforms | Model |
|---|---|---|---|
| Proloquo2Go (AssistiveWare) | ~$250 one-time | iPad/iPhone only | Core-word (Crescendo), consistent positions |
| TouchChat HD w/ WordPower (Saltillo) | ~$300 one-time | Apple only | Selectable grids, 25–108+ buttons |
| LAMP Words for Life (PRC-Saltillo) | ~$300 one-time | Apple only | Motor planning (Minspeak/Unity) |
| TD Snap (Tobii Dynavox) | ~$50 | iPad, Windows | Core-word + motor-plan page sets |
| Avaz | ~$10/mo or ~$179–200 | iPad, Android | Symbol grid, subscription |
| CoughDrop | $9/mo or $295 lifetime | Everything + browser | Grid, cloud sync, open-source core |
| SoundingBoard (AbleNet) | Free | iOS only | Recorded-message boards |
| LetMeTalk | Free | iOS, Android | ARASAAC symbol grid, offline |
| Cboard | Free/freemium | Browser, any device | Symbol grid, 40+ languages |
| Look to Speak (Google) | Free | Android | Eye-gaze phrase lists |

Pattern: the robust apps are Apple-locked and $250–300 per copy; the free ones are
either very simple or freemium. Nothing is designed around a *parent maintaining two
different kids' systems from her phone*.

## Open-source ecosystem (build on, don't rebuild)

- **AsTeRICS Grid** — grid.asterics.eu, free, open source (AGPL), runs offline in any
  browser, no account needed, supports recorded audio AND TTS, switch scanning, multiple
  user configs. The closest existing thing to what we want; its weakness is an editor
  built for AT professionals, not for a busy mom. **Worth showing mom as a benchmark
  before/while building.**
- **Cboard** — cboard.io, open source (GPL, React web app), UNICEF-backed, symbol grid +
  browser TTS. Freemium hosted version.
- **CoughDrop** — open-source core, cross-platform, cloud sync; the commercial hosted
  version is $9/mo.
- **OpenAAC standards** (openaac.org):
  - **Open Board Format (.obf/.obz)** — JSON board interchange format. Use it as the
    native board format so boards can move in/out of Cboard, CoughDrop, etc.
  - **OpenSymbols API** (opensymbols.org) — searchable aggregate of open symbol sets.

## Symbol licensing (the legal constraint)

| Set | License | Notes |
|---|---|---|
| ARASAAC | CC BY-NC-SA | ~10k+ symbols, the standard free set. NC = fine for family use, blocks commercial resale |
| Mulberry | CC BY-SA | ~3,600 SVG symbols, liberal license, adult-appropriate vocabulary |
| Global Symbols | CC BY-SA | Open, multicultural, has an API |
| PCS (TD Snap) | Proprietary | **Cannot be reused** — Tobii Dynavox license |
| SymbolStix, AbleNet symbols | Proprietary | Same — do not copy |

For mimicking TD Snap boards: same words, same positions, but ARASAAC/Mulberry symbols
or mom's photos instead of PCS. Photos of real objects/people are often *better* for
the user anyway.

## Why mom has to fight the state (funding reality)

- Dedicated speech-generating devices (SGDs) are **durable medical equipment** — Medicaid
  must cover them with an SLP evaluation + physician prescription. But consumer
  **iPads + apps are rarely reimbursed** ("not primarily medical"), which is exactly the
  petition-and-fight loop mom is stuck in.
- The school route: under IDEA, if AAC is written into the **IEP**, the district must
  provide and fund it — "no funds" is not a legal denial reason. Ask in writing for an
  assistive-technology evaluation; get device, training, and all-day access into the IEP.
- Appeal resources: aacfundinghelp.com (templates), Tobii Dynavox's appeals guide,
  state Disability Rights orgs, Medicaid fair hearings (services continue during appeal).
- **A web app changes the game:** it runs on any $100 Android tablet, an old phone, a
  school Chromebook, or the funded iPads — a denial or a broken device never again means
  losing a voice.

## Premium feature matrix (researched 2026-08-01)

From the vendors' own product pages (assistiveware.com, us.tobiidynavox.com,
touchchatapp.com). "Ours" reflects the deployed app.

| Feature | Who has it | Ours |
|---|---|---|
| Word Finder / search with path to word | TouchChat (Word Finder(TM)), TD Snap | YES - search + "Home > food > cookie" path + jump & highlight |
| Keyboard / typing with prediction | Proloquo2Go, TD Snap (Text page set) | YES - prediction ranks the child's own vocabulary + usage first |
| Data logging for SLPs | TouchChat | YES - local-only log, CSV export |
| Vocabulary masking (hide buttons, keep position) | Standard in premium apps | YES |
| Dwell / hold-to-activate timing | TouchChat (dwell + release time) | YES - per-profile Off/0.3/0.6/1s |
| Recorded speech per button | TouchChat, SoundingBoard | YES |
| Grid sizes | P2G: 23 layouts 9-144; TouchChat: 25-108 | YES - any grid 1x1 to 10x10 |
| Undo while editing | Premium editors | YES (session, 25 levels) |
| Auto-backup to cloud | TouchChat (iCloud/Drive/Dropbox, keeps 3 versions) | Partial - manual file backup/share; auto-sync needs a backend (pending) |
| Copy/paste + drag buttons | TouchChat | Partial - swap-move only |
| Grammar support (conjugation, plurals) | Proloquo2Go (Crescendo) | No - candidate for next round |
| Premium voices (Acapela children's voices) | P2G: 100+ voices | No - device voices only (licensed voices cost money; Apple's built-ins are decent) |
| Symbol libraries 27k-40k (PCS, SymbolStix) | All three | Different - ARASAAC/open sets + photos (proprietary sets can't be licensed for free) |
| Eye gaze / head tracking | TD Snap, TouchChat | No - hardware-dependent, out of scope for a free web app |
| Switch scanning | All three | No - on the roadmap (keyboard-interface switches are web-reachable) |
| Bilingual mid-sentence switching | Proloquo2Go | No |
| Visual scene displays | TD Snap ecosystem | No |

## Recommendation

Build a **PWA (installable web app), offline-first**, because:

1. **No Mac needed.** Develops on this machine; installs on mom's iPhones/iPads via
   Safari "Add to Home Screen" — full screen, offline, no App Store, no developer account.
2. One codebase covers iPad, iPhone, Android, Chromebook, desktop.
3. iOS Safari supports everything required: service workers (offline), IndexedDB
   (boards + audio storage), Web Speech API (TTS), MediaRecorder (mom's voice
   recordings), and Bluetooth switch input arrives as keyboard events.

### The $0 stack

| Need | Free answer |
|---|---|
| Speech | Web Speech API — on-device TTS voices on iOS/Android, offline, no per-word cost |
| Symbols | ARASAAC / Mulberry / Global Symbols (open licenses) + mom's own photos |
| Hosting | Static PWA on GitHub Pages or Cloudflare Pages free tier |
| Storage | On-device (IndexedDB) — no server, no accounts, no monthly bill for v1 |
| Devices | Whatever already exists: the funded iPads, mom's iPhones, any cheap Android tablet |

Total ongoing cost: $0. Nothing to license, nothing to subscribe to, nothing the state
can take away.

### Core requirements (v1)

- Two profiles, two board styles: photo grid (SoundingBoard-mimic layout, TTS-voiced)
  and symbol/TTS grid with sentence bar (Snap-mimic). Fixed layouts, per-profile grid
  size.
- **TTS by default, everywhere.** Mom types the word; the device speaks it.
  (Per-button recorded audio as an optional override: later milestone.)
- **Mom's editor is the product:** add a button in under 30 seconds from her phone —
  snap a photo or search open symbols, type the word, done.
- **AUMI principle:** every tap responds instantly (speech + visual feedback); no dead
  ends, no error states the kids can land in.
- Offline-first; communication must work with zero connectivity.
- OBF-shaped board model with an Open Board Format exporter; full .obf/.obz
  import/export is a later milestone. V1 ships whole-app JSON backup/restore
  instead (arguably more valuable to mom: one file = every board and photo).
- A "kiosk" feel in use: no accidental exits, edit mode behind a long-press
  (iOS Guided Access covers the rest on Apple devices).

### Later milestones

- Sync boards across devices (so mom edits on her phone, the kids' tablets update).
- **Play/music board** (AUMI-inspired): a board mode where buttons trigger sounds and
  musical phrases via the Web Audio API — no wrong notes, pure cause-and-effect joy.
  Makes the device something the kids *want* to reach for, not just a needs terminal.
- Switch-scanning access mode.
- Print-to-paper backup boards (the no-battery fallback).

### Before building from scratch

Show mom **AsTeRICS Grid** (grid.asterics.eu) for 15 minutes. If she finds it usable,
it may cover sibling needs today for $0 and the custom build can focus on what it
lacks (the mom-simple editor, the two-kid workflow). If it overwhelms her — that's the
strongest possible validation for building this app.
