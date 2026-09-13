# Interactive Map

Lightweight interactive map built with Leaflet and vanilla JavaScript. This project includes a modern, minimal UI, category filtering, and search — all without a build step (CDN dependencies).

## Highlights 
- Minimal, light basemap (Carto Positron) for a clean look.
- Custom header UI: rounded search pill and a category dropdown (custom menu + hidden `<select>` kept for compatibility).
- Modern marker styling: subtle circle markers and simplified popups with rounded corners and soft shadow.
- Compact custom map controls: zoom in / zoom out / locate (geolocation), positioned bottom-right.
- UX / safety: tiles capped (noWrap) and map panning clamped to world bounds to prevent duplicated map copies.

## Features
- Interactive map with location markers loaded from `data/locations.json`.
- Name search and category filtering.
- Shareable state can be added (see "Next steps").
- Lightweight (no build) — ready to run locally.

## Quick start
1. Clone or download the repo.
2. Start a simple HTTP server from the project root (recommended so modules and assets load correctly):

```bash
python3 -m http.server 8000
```

3. Open http://localhost:8000 in your browser.

Notes:
- The app loads Leaflet and Tailwind via CDN from `index.html`.
- Grant geolocation permission in the browser to use the "locate" button.

## File overview
- `index.html` — App shell, header UI, styles.
- `script.js` — App entry that initializes modules.
- `modules/map.js` — Map initialization and custom controls (tile layer, bounds, locate handler).
- `modules/markers.js` — Loads `data/locations.json` and renders minimalist circle markers + popups.
- `modules/search.js` — Wires search input and category filtering.
- `modules/utils.js` — Small helpers (debounce, etc.).
- `data/locations.json` — Locations data (name, lat/lng, category, description).

## How it works (technical notes)
- The visible category dropdown is a custom UI; a hidden `<select id="categorySelect">` remains so existing JS can listen to `change` events without modification.
- Map tiles use Carto's Positron tiles (`light_all`) for a neutral aesthetic.
- `noWrap: true` and `setMaxBounds([[-90,-180],[90,180]])` are applied to prevent horizontal repetition of the world map.

## Customization
- Add or edit locations in `data/locations.json`. Each entry should include `name`, `lat`, `lng`, `category`, and `description`.
- Change tile provider, colors, popup layout in `modules/map.js` and `modules/markers.js`.
- To change the minimum zoom, edit `minZoom` in `modules/map.js`.

## Next steps / Suggested improvements
1. Marker clustering (Leaflet.markercluster or Supercluster) for large datasets.
2. Autocomplete geocoding (Mapbox, Nominatim, or Algolia) for improved search.
3. Shareable URLs encoding center/zoom and filters.
4. Accessibility improvements (ARIA, keyboard navigation for dropdowns and popups).

## Credits
- [Leaflet.js](https://leafletjs.com/)
- Carto basemaps (Positron)

