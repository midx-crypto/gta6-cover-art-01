# Vice Cover Studio — Make GTA 6 Cover Art

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/midx-crypto/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/midx-crypto/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) on make.fun — a free, offline browser app that turns any photo into GTA 6-style cover art: a multi-panel Vice City poster with a giant 3D gradient title, neon script subtitle, place/time labels, stars, quote, seal badge, WANTED pill and a collector's bottom strip, exported as a share-ready PNG.

Referral code: `g5h40b4t`

## What it does

- **6 layouts**: Hero Top, Hero Left, Slash Cut, Three Panel, Four Square, Portrait Stack
- **5 colour grades**: Vice Sunset, Neon Night, Gold Hour, Magenta Dusk, Teal Noir
- **Giant 3D title** in Anton with a gradient fill, plus a Pacifico script subtitle
- **Per-panel labels**: place, time and tagline on every panel
- **Badges**: seal badge, WANTED pill, VOL. 06, COLLECTOR'S EDITION, stars + quote strip
- **Crop per panel**: drag a panel to reframe it, scroll to zoom, or use the zoom slider
- **Your photos**: upload local photos, or use the 6 built-in samples (4 made for this entry, 2 from the starter kit)
- **Undo** (button or Ctrl+Z) and **export** to PNG in 1080×1080, 1080×1350 or 1920×1080

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Everything runs locally in the browser — no network requests, no uploads, no account.

## Screenshots

The cover (Hero Top, Vice Sunset), the editor (Four Square, Neon Night), a portrait cover (Portrait Stack, Magenta Dusk) and a square cover (Three Panel, Gold Hour) live in `screenshots/`.

## Build the dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into the output dir, prints a build summary, and writes `dossier.json` with the vendored make.fun library.

## Fonts and photos

- Anton and Pacifico are licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
- The four photos `convertible.jpg`, `neon-portrait.jpg`, `coast-road.jpg` and `gas-station.jpg` in `app/samples/` were generated for this entry with an image model; `boulevard.jpg` and `pier.jpg` come from the starter kit.
