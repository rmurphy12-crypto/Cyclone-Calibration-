# Cyclone 3 — Sprayer Calibration

A pocket calibration log and mix calculator for the **FlowZone Cyclone 3 (FZVAAJ-3)** 4-gallon backpack sprayer. Log your real spray rate for every nozzle × dial-speed combination, then turn any product label rate into exact tank measurements.

No accounts, no server, no dependencies: it's a plain HTML/JS app that runs entirely in your browser and works offline. All data stays on your device.

## Using the app

**Quick start:** open `index.html` in any browser. That's it.

**Install it on your phone (recommended for field use):** the app is a PWA — when it's served over HTTPS it can be added to your home screen and works with no signal at all.

The easiest free hosting is GitHub Pages:

1. In this repository on GitHub, go to **Settings → Pages**.
2. Under "Build and deployment", set Source to **Deploy from a branch**, pick the `main` branch and `/ (root)`, and save.
3. After a minute your app is live at `https://<your-username>.github.io/<repo-name>/`. Open that on your phone and choose **Add to Home Screen** (Share menu on iOS, browser menu on Android).

### The four tabs

- **Calibrate** — pick a nozzle and dial position (1–5), choose a measurement method, and enter what you measured. The live readout shows gal/1,000 ft², time per 1,000 ft², flow rate (GPM), estimated pressure, and how far a full tank goes. Save it to build your calibration plate.
- **Calibrations** — your saved readings as a nozzle × speed matrix. Tap any cell for detail, edit/recalibrate, or delete. Copy the log as text, or back up / restore everything as JSON (download a file or copy-paste).
- **Reference** — the published GPM/PSI chart for the four stock nozzles (FZVAAJ-3 operation guide, p. 16).
- **Mix** — pick a saved calibration, enter the area to treat and the product's label rate (per 1,000 ft² or per acre), and get product-per-gallon, totals, tankfuls (rounded up, with the exact figure), and the fill amounts for the last partial tank.

### The three calibration methods

All methods produce **gal per 1,000 ft² (gpk)**, the number everything else builds on.

1. **Flow × Time** (best for this sprayer). Spray into a bucket at your dial speed and measure `oz` collected over `sec`; separately time a real pass over a measured area.
   - `GPM = (oz ÷ 128) ÷ (sec ÷ 60)`
   - `time per 1,000 ft² = (pass sec ÷ pass ft²) × 1000`
   - `gpk = GPM × (time per 1,000 ft² ÷ 60)`
2. **Area & Volume** (refill method). Spray a known area, measure the water used: `gpk = (gal used ÷ ft²) × 1000`.
3. **1/128 acre**. One acre is 43,560 ft², so a **340.3125 ft²** plot (≈18.5 × 18.5 ft) is exactly 1/128 acre — and since a gallon is 128 oz, *ounces collected in the plot time = gallons per acre*. The app scales correctly if your plot isn't exactly that size, and converts to gpk via `gpa ÷ 43.56`.

For custom nozzles without a factory chart, enter the tip's rated point (e.g. a TeeJet "04" tip is 0.40 GPM at 40 PSI) and the app back-calculates working pressure from your measured flow: `PSI = rated PSI × (measured GPM ÷ rated GPM)²`.

### Your data

Everything is stored in your browser's `localStorage`, per device and per browser. Clearing site data deletes it — so use **Calibrations → Backup** now and then: download the JSON file or paste it somewhere safe. Restoring offers **Merge** (adds the backup to what's on the device; the backup wins on conflicts) or **Replace all** (asks for confirmation first). Backups are validated on the way in, so a damaged file can't corrupt your log.

## Development

- No build step, no framework, no npm packages. `index.html` holds the UI; `calc.js` holds the math (shared between the browser and the tests).
- Run the math tests: `node tests/calc.test.js`
- To test the service worker / PWA locally, serve over HTTP instead of opening the file directly: `python3 -m http.server` then visit `http://localhost:8000`.
- **If you change any app file, bump the `CACHE` version string in `sw.js`** so installed copies pick up the update.

| File | Purpose |
| --- | --- |
| `index.html` | App shell, styles, UI logic, localStorage persistence |
| `calc.js` | Pure calibration math, input parsing, backup validation |
| `sw.js` | Service worker — precaches the app for offline use |
| `manifest.webmanifest` | PWA manifest (name, icon, colors) |
| `icon.svg` | App icon / favicon |
| `tests/calc.test.js` | Zero-dependency test suite for `calc.js` |
