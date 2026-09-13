/**
 * Markers module
 * Responsibilities:
 *  - Fetch the static JSON data from `data/locations.json`
 *  - Create and manage marker instances shown on the Leaflet map
 *
 * Public API:
 *  - loadMarkers(): fetch data and render initial markers
 *  - renderMarkers(locations): render the provided list of locations
 *  - getAllLocations(): return the loaded JSON array
 */

import { getMapInstance } from "./map.js";

let allLocations = [];
let activeMarkers = [];

/**
 * Load location data from the static JSON file and render markers.
 * This function caches the JSON in `allLocations` for later filtering.
 */
export async function loadMarkers() {
  try {
    const response = await fetch('./data/locations.json');
    allLocations = await response.json();
    renderMarkers(allLocations);
  } catch (error) {
    console.error("Error loading markers:", error);
  }
}

/**
 * Render markers on the map for a specific list of locations.
 * Existing markers are removed before rendering the new set.
 * Each marker uses a compact circle style and a small popup with
 * a title, description, and a category pill. The popup HTML is
 * intentionally inline and lightweight so this module can be used
 * without external templating.
 *
 * @param {Array} locations - array of location objects { id, name, category, lat, lng, description }
 */
export function renderMarkers(locations) {
  const map = getMapInstance();

  // remove any previously added markers
  activeMarkers.forEach(marker => marker.remove());
  activeMarkers = [];

  locations.forEach(location => {
    // use a subtle circle marker for a minimal look
    const circle = L.circleMarker([location.lat, location.lng], {
      radius: 6,
      color: '#2563eb', // blue-600
      weight: 1.5,
      fillColor: '#60a5fa', // blue-400
      fillOpacity: 0.9
    }).addTo(map);

    // bind a compact popup. Keep styling inline to avoid adding extra CSS
    circle.bindPopup(`
      <div style="max-width:220px; font-family:system-ui, -apple-system, 'Segoe UI', Roboto;">
        <div style="font-weight:600; color:#0f172a; margin-bottom:6px">${location.name}</div>
        <div style="color:#475569; font-size:13px; margin-bottom:8px">${location.description}</div>
        <div style="display:inline-block; background:#eef2ff; color:#3730a3; padding:4px 8px; border-radius:999px; font-size:12px">${location.category}</div>
      </div>
    `, { className: 'modern-popup' });

    activeMarkers.push(circle);
  });
}

/**
 * Return the array of loaded locations (from JSON).
 */
export function getAllLocations() {
  return allLocations;
}