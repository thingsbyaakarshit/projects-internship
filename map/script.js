/**
 * Application entrypoint
 * This file is intentionally small: it composes the modules in `modules/`
 * and triggers the initial app lifecycle: initialize the map, load markers,
 * and wire up the search/filter UI.
 *
 * Exports: none (side-effectful startup script)
 */

import { initMap } from './modules/map.js';
import { loadMarkers } from './modules/markers.js';
import { initSearch } from './modules/search.js';

// Initialize core pieces in deterministic order:
// 1) create the map so other modules can reference it
// 2) load markers from the static JSON file
// 3) wire search & category filter behavior
initMap();
loadMarkers();
initSearch();