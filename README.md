# Kabadiwala Connect — कबाड़ीवाला कनेक्ट

**SIH 2026 · PS SIH26229 · Ministry of Mines / JNARDDC · Team Fire Orbit**

A vernacular (Hindi · Marathi · English), low-literacy, **offline-first** mobile platform that lets informal
scrap collectors discover fair prices, find CPCB-authorized recyclers, complete a GPS-verified digital
handover, get paid (cash or UPI) and build an earnings history — plus a recycler-facing console.

It is a **PWA (progressive web app)**: nothing to install for developers, nothing to sideload for users.
Open a link on an Android phone, tap *Install*, and it behaves like a native app and keeps working offline.

---

## ▶ Run it — pick the easiest option for you

### Option 1 — just open it (no setup, any device) — 10 seconds
**Live app:** https://rahulskandagal.github.io/kabadiwala-connect/
**Start page with QR codes + demo script:** https://rahulskandagal.github.io/kabadiwala-connect/start.html
**Recycler console:** https://rahulskandagal.github.io/kabadiwala-connect/recycler.html

On the phone: Chrome → the link → *Install* banner (or ⋮ → *Add to Home screen*). Camera, GPS, voice and
offline mode all work on the hosted link because it is HTTPS.

<p align="center"><img src="icons/qr-app.png" width="180" alt="QR: collector app"> &nbsp;&nbsp; <img src="icons/qr-console.png" width="180" alt="QR: console"></p>

### Option 2 — double-click to run locally (Windows / Mac / Linux) — 30 seconds
1. Download the ZIP (green **Code** button → *Download ZIP*) or `git clone https://github.com/rahulskandagal/kabadiwala-connect`.
2. Double-click **`run.bat`** (Windows) or run **`./run.sh`** (Mac/Linux — `chmod +x run.sh` once).
3. Your browser opens `http://localhost:8090/start.html`. The window also prints the **phone URL** for devices on the same Wi-Fi.

That's it. The launcher uses whatever you already have — Python 3 or Node.js — and installs nothing.
If you have neither, install Python from https://www.python.org/downloads/ (tick *Add to PATH*).

> Camera and GPS require HTTPS **or** localhost. On the laptop everything works; on a phone via `http://192.168.x.x`
> the browser blocks camera/GPS, so for phone demos use Option 1 (the hosted link) — or pick a sample photo.

### Option 3 — any static server / Docker
```bash
python -m http.server 8090          # or: npx serve -l 8090 .
docker build -t kabadiwala-connect . && docker run -p 8090:80 kabadiwala-connect
```
There is no build step, no database to install, no environment variables. Everything is plain HTML/CSS/JS.

### Deploy your own copy (free)
Fork the repo → *Settings → Pages → Source: main / root* → your app is live at `https://<you>.github.io/kabadiwala-connect/`.

---

## What's inside

| | |
|---|---|
| `start.html` | Landing page: QR codes, links, 2-minute demo script |
| `index.html` + `js/app.js` | Collector app — Price (Snap & Value) · Board · Recyclers · Earnings · Safety |
| `recycler.html` | Recycler / MoM console — incoming lots, OTP confirm, pay, EPR CSV export (hash-chain verified) |
| `js/ai.js` | On-device image classification (TensorFlow.js MobileNet → e-waste categories) |
| `js/i18n.js` | Hindi · Marathi · English strings (UI + speech) |
| `js/db.js` | IndexedDB store + SHA-256 for the tamper-evident handover chain |
| `sw.js`, `manifest.webmanifest` | Offline cache + installability |
| `data/*.json` | Prices (12 materials, 60-day history), recyclers, categories, safety cards — regenerate with `python tools/gen_data.py` |
| `samples/` | Six CC-licensed e-waste photos for demos (credits in `samples/CREDITS.md`) |

## Requirement → implementation

| PS requirement | Where |
|---|---|
| Photo-based cataloguing with AI valuation | Camera/gallery → MobileNet on-device → category suggestions (collector confirms) → ₹/kg |
| Transparent price discovery + history | Price band (low/market/high), 30-day sparkline, sources; Board tab |
| Audio price boards for low literacy | 🔊 buttons, tap-to-hear rows, 🎤 voice query (Web Speech, hi-IN / mr-IN) |
| Authorized recycler directory + matching | Score = 40 % material coverage + 25 % distance + 20 % price + 10 % rating + 5 % pickup |
| Digital handover with GPS | GPS + timestamp + items + weight + payment → SHA-256 hash-chained record, OTP, QR, trace ID |
| End-to-end traceability | Console lists every lot; CSV export verifies the chain (EPR / Form-6 ready) |
| Earnings ledger / financial history | Monthly totals, chart, per-deal list, CSV statement, collector ID |
| Safety guidance | Safety tab + contextual tips on hazardous categories, with audio |
| Hindi & Marathi | Full UI + speech in both; English too |
| Offline-first | Service worker precaches shell, data, samples, CDN libs and the model; IndexedDB storage; sync when online |
| Entry-level Android | No framework runtime; MobileNet v2 α=0.5 (~5 MB); Android 8+ / Chrome |
| Cash transactions | Cash or UPI; both OTP-confirmed and recorded identically |

## 2-minute demo
1. **Price** → tap a sample photo (or take one) → AI suggests → 🔊 hear the price → set weight → **Save**.
2. **Recyclers** → *Use my location* → best match → **Book pickup**.
3. **Cash** or **UPI** → *Create handover & OTP* → OTP + QR receipt.
4. **Console** (top-right) → select the recycler → enter OTP → **Confirm** → **Mark paid**.
5. **Earnings** shows the paid deal → download the CSV.
6. Airplane mode → reload → still works.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Camera button does nothing on a phone | You're on `http://<ip>` — browsers block camera/GPS without HTTPS. Use the hosted link, or a sample photo. |
| No voice | The phone needs a Hindi/Marathi TTS voice (Android: Settings → Text-to-speech → Google). English works everywhere. |
| "AI unavailable offline" | The model downloads (~5 MB) on the first *online* open; after that it is cached. |
| Console shows no lots | App and console share the **same device's** storage in this prototype; open both on the same laptop/phone. |
| Old version showing after an update | Reload once more — the service worker fetches the new shell on the next online load. |

## Honest notes
- Prices are a **demo dataset** seeded from public market surveys; production uses live recycler quotes + metal indices.
- Recycler entries are illustrative; EPR IDs are placeholders until the CPCB registry is integrated.
- App and console share the device's IndexedDB for the live demo; a small backend (`window.KC_API` hook exists) replaces that in a pilot.

Licence: MIT for the code; sample photos under their respective CC licences (see `samples/CREDITS.md`).
