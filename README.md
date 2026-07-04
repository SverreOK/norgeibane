# norgeibane.no

**Norge i bane** — a real-time 3D globe tracking every Norwegian satellite in
orbit. Fully static: CesiumJS renders the Earth; satellite.js propagates live
CelesTrak TLEs with SGP4. The satellite list is discovered dynamically
(`OWNER = NOR`), so new launches appear without code changes.

## Run locally

Requires Node.js ≥ 20.

```bash
npm install     # dependencies + dev server
npm run setup   # vendors CesiumJS + satellite.js, creates js/config.js
npm run dev     # http://localhost:8080
```

## Configure

Edit `js/config.js` (created by `setup`, gitignored). Key options: `ionToken`
(empty = free fallback imagery), `coffeeUrl` (donation button; empty hides it),
`defaultLanguage` (`no`/`en`). See `js/config.example.js` for the full list.

## Deploy

The site is the folder minus `node_modules/`. Pushing to `main` auto-deploys to
GitHub Pages via `.github/workflows/deploy.yml`.

## Credits

Data: [CelesTrak](https://celestrak.org). Globe: [CesiumJS](https://cesium.com).
Propagation: [satellite.js](https://github.com/shashwatak/satellite-js). Imagery:
Cesium Ion, [EOX Sentinel-2](https://s2maps.eu), [NASA GIBS](https://earthdata.nasa.gov/gibs).
