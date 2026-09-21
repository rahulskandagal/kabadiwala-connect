# Kabadiwala Connect — कबाड़ीवाला कनेक्ट

**SIH 2026 · PS SIH26229 · Ministry of Mines / JNARDDC · Team Fire Orbit**

A vernacular (Hindi · Marathi · English), low-literacy, **offline-first** mobile platform that lets informal
scrap collectors discover fair prices, find CPCB-authorized recyclers, complete a GPS-verified digital
handover, get paid (cash or UPI) and build an earnings history — plus a recycler-facing console.

Built as an **installable PWA** so it runs on any entry-level Android phone straight from a link, with no
app-store step, and keeps working without network once opened once.

| | |
|---|---|
| Collector app | `index.html` |
| Recycler / MoM console | `recycler.html` |
| Datasets | `data/prices.json` (12 materials, 60-day history), `data/recyclers.json`, `data/categories.json`, `data/safety.json` |

## Requirement → implementation

| PS requirement | Where |
|---|---|
| Photo-based cataloguing with AI valuation | Snap tab: camera → **TensorFlow.js MobileNet on-device** → e-waste category suggestions (collector confirms) → ₹/kg |
| Transparent price discovery + history | Price card & Board tab: today's band (low/market/high), 30-day sparkline, sources |
| Audio price boards for low literacy | 🔊 buttons and tap-to-hear rows (Web Speech, hi-IN / mr-IN), 🎤 voice query |
| Authorized recycler directory + matching | Recyclers tab: score = 40 % material coverage + 25 % distance + 20 % price + 10 % rating + 5 % pickup |
| Digital handover with GPS | Handover: GPS + timestamp + items + weight + payment, **SHA-256 hash-chained**, QR + trace ID |
| End-to-end traceability | Recycler console shows every lot; CSV export verifies the hash chain (EPR / Form-6 ready) |
| Earnings ledger / financial history | Earnings tab: monthly totals, chart, per-deal list, CSV statement, collector ID |
| Safety guidance | Safety tab + contextual tip on hazardous categories, with audio |
| Hindi & Marathi | Full UI + speech in both; English too |
| Offline-first | Service worker precaches shell, data, CDN libs and the model; IndexedDB stores items/handovers; sync when online |
| Entry-level Android | No framework runtime; MobileNet v2 α=0.5 (~5 MB); works from Android 8 / Chrome |
| Cash transactions | Payment = cash or UPI; both confirmed by OTP and recorded identically |

## Run locally

```bash
python -m http.server 8090      # any static server works
# open http://localhost:8090/index.html  (collector)  and  /recycler.html (console)
```
On a phone on the same Wi-Fi: `http://<your-laptop-ip>:8090/`. For camera + GPS the page must be
served over **HTTPS or localhost** — the GitHub Pages deployment satisfies this.

Regenerate datasets: `python tools/gen_data.py`.

## Demo script (2 minutes)
1. Snap tab → take/choose a photo of a phone or PCB → AI suggests category → hear the price → set weight → save.
2. Recyclers tab → allow location → best-match recycler → **Book pickup**.
3. Handover → choose **Cash** → create → OTP + QR receipt.
4. Open **Console** (top-right) → select the recycler → enter OTP → Confirm → Mark paid.
5. Back in the app: Earnings tab shows the deal as paid; export the statement CSV.
6. Turn on airplane mode and reload — the app still opens with prices, recyclers and history.

## Architecture
```
Collector PWA (index.html)                  Recycler console (recycler.html)
 ├─ js/i18n.js   hi / mr / en strings        ├─ incoming lots, OTP confirm, pay
 ├─ js/ai.js     TF.js MobileNet → category  ├─ materials, weekly intake
 ├─ js/db.js     IndexedDB + SHA-256          └─ EPR / Form-6 CSV export (chain-verified)
 ├─ js/app.js    tabs, matching, handover
 └─ sw.js        offline cache               data/*.json  ← tools/gen_data.py
```
Optional backend (`window.KC_API`): the app POSTs unsynced handovers to `/handovers`; a FastAPI +
PostGIS service with live recycler quotes and the CPCB registry feed is the next milestone.

## Honest notes
- Prices are a **demo dataset** seeded from public market surveys; production uses recycler quotes + metal indices.
- Recycler entries are illustrative; EPR IDs are placeholders until the CPCB list is integrated.
- The console and app share the device's IndexedDB for the live demo; a backend replaces that for real deployments.
