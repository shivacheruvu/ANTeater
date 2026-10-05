# ANTeater

An anteater eats ants; this one eats through ingredient lists so you don't have to.

Scan a grocery barcode and get a clear health score in about a second: what's driving it, which additives to
watch, and a better option in the same aisle. It's a free, open-source replacement for paid food-scanning apps,
and it runs entirely in the browser.

**Try it:** https://shivacheruvu.github.io/ANTeater/ — on a phone, use *Add to Home Screen* to install it.

[![Tests](https://github.com/shivacheruvu/ANTeater/actions/workflows/ci.yml/badge.svg)](https://github.com/shivacheruvu/ANTeater/actions/workflows/ci.yml)
[![Secret scan](https://github.com/shivacheruvu/ANTeater/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/shivacheruvu/ANTeater/actions/workflows/secret-scan.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What it does

- **Scan** with the phone camera (native `BarcodeDetector`, with a ZXing fallback for iPhone), or type the number.
- **Score 0–100**: nutrition 60, additives 30, organic 10, with a cap at 49 for any high-risk additive.
  [How the score works](docs/METHODOLOGY.md).
- **Explain additives**: each one is rated High / Moderate / Limited / No known risk, with the reason and source.
- **Find a better option**: searches the same category for higher-scoring products sold in your region.
- **Track spending**: log what you paid; see monthly spend and how much went to Poor or Bad items. Export CSV/JSON.
- **AI, bring your own key (optional)**: photograph an ingredient list when a product isn't in the database, and
  Gemini reads it into the same scoring engine; or ask Gemini to explain a score in plain English.
- **Works offline**: installable PWA; scanned products are cached on the device, and six saved products keep a
  demo working even without a connection.

## Architecture

```
camera / typed barcode ──► Open Food Facts API (no key) ──► on-device cache
                                     │
ingredient photo ──► Gemini (your key, from the browser) ─┤
                                     ▼
                        scoring engine (src/score.js) ──► shelf-tag result, swaps, history
```

No backend, no database, no accounts. Everything is static files on GitHub Pages.

| File | Role |
|---|---|
| `src/score.js` | Scoring engine (pure functions, unit tested) |
| `src/additives.js` | Additive risk reference with notes |
| `src/off.js` | Open Food Facts client with caching and rate-limit handling |
| `src/gemini.js` | Optional BYOK Gemini: label OCR and explanations; auto-picks the newest Flash model |
| `src/scanner.js` | Camera barcode scanning |
| `src/store.js` | On-device history, spend summary, CSV export |

## Run it yourself

```bash
git clone https://github.com/shivacheruvu/ANTeater.git
cd ANTeater
python3 -m http.server 8000      # then open http://localhost:8000
npm test                          # scoring tests (Node 20+)
```

No `.env` is needed. For the AI features, paste your own free key from
[Google AI Studio](https://aistudio.google.com/apikey) into Settings in the app. See [SECURITY.md](SECURITY.md).

## Data and credits

Product data and images from [Open Food Facts](https://world.openfoodfacts.org) (ODbL / CC BY-SA). Barcode
decoding by [ZXing](https://github.com/zxing-js/browser) (MIT / Apache-2.0). Scores are informational, not
medical advice.

Built by [Shiva Chinthalacheruvu](https://shivacheruvu.github.io) with Claude.
