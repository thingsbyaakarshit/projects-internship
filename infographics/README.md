# Infographics — Minimal charts & map visualizations

Small static web project demonstrating minimal, responsive infographics: a dual-line chart, an age-group doughnut, and a Leaflet map with a clickable top-10 country list.

## Quick overview
- Static HTML/CSS/JS app organized as a minimal SPA (`index.html` loads pages from `pages/` into `#app`).
- Uses Tailwind for styling (prebuilt `src/output.css`), Chart.js for charts, and Leaflet for the map.
- Data lives in `data/` as JSON files (top-ten, age distribution, etc.).

## Prerequisites
- Node.js / npm (for Tailwind CLI if you regenerate CSS)
- A simple static server to serve files (do not open via `file://` — use an HTTP server)

## Run locally (recommended)
Open a terminal in the project root and run the Tailwind CLI (optional during development) and a static server.

1) Build Tailwind (watch mode - run if you edit `src/input.css`):

```bash
# from project root (zsh)
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```

2) Start a local static server (Python example):

```bash
# from project root
python3 -m http.server 8000
# then open http://localhost:8000/#/home or http://localhost:8000/#/chart
```

You can also use any static server (http-server, serve, etc.).

## Project structure (high level)
- `index.html` — app shell and floating nav
- `pages/` — HTML fragments loaded into `#app` (e.g., `home.html`, `chart.html`)
- `src/` — JS modules and CSS inputs
  - `src/modules/` — ES modules: `map.js`, `countries.js`, `homeChart.js`, `agePie.js`, etc.
  - `src/input.css` — Tailwind input
  - `src/output.css` — generated Tailwind output (usually ignored in git)
- `data/` — JSON data files used by the app
- `assets/` — images and icons

## Important notes — Map & CORS
The UI uses client-side calls to display countries on a Leaflet map. Public geocoding services (e.g., Nominatim) are often blocked by browser CORS policies when called from the client. To avoid runtime CORS failures this project uses precomputed coordinates where possible:

- `data/country_coords.json` contains precomputed lat/lon for the top-10 dataset.
- `src/modules/countries.js` prefers `item.coordinates` or entries in `data/country_coords.json` and does not call Nominatim from the browser.

If you add countries not present in `data/country_coords.json`, add their coordinates to that file or provide a `coordinates` object in the corresponding JSON entry.

## Troubleshooting
- Map appears under the floating nav: this is caused by Leaflet panes having high z-index. The floating nav has been given a high z-index in `index.html` (style attribute). If you change styles, ensure the aside has a z-index above Leaflet (e.g., 2000).

- Charts resizing continuously: Chart.js needs a fixed height context. The canvases are wrapped in containers with explicit heights for stable rendering.

- Fetching JSON fails when opening `index.html` directly from the filesystem (`file://`). Always use an HTTP server.

## Editing data
- `data/top_ten_countries_depression.json` — list of countries (can include a `coordinates` object with `{ latitude, longitude }`) which will be used by the map if present.
- `data/country_coords.json` — local map from country name -> { lat, lon }. Keep this in sync if you add new countries.

Example `country_coords.json` entry:

```json
{
  "India": { "lat": 20.5937, "lon": 78.9629 }
}
```

## Development tips
- Add or update `src/input.css` and run the Tailwind CLI watch command shown above.
- Use the browser devtools device toolbar to test mobile responsiveness.
- If you need server-side geocoding (to avoid CORS or rate limits), add a very small server endpoint that calls a geocoding API and returns the coordinates; update `src/modules/countries.js` to call your server instead of a remote geocoder.
