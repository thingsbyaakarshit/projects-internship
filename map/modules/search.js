/**
 * Search & filter module
 * Responsibilities:
 *  - Wire the search text input and category dropdown UI
 *  - Filter locations (loaded by `modules/markers.js`) based on the
 *    current text query and the selected category
 *  - Re-render markers and adjust the map view to match results
 */

import { getAllLocations, renderMarkers } from './markers.js';
import { getMapInstance } from './map.js';
import { debounce } from './utils.js';

/**
 * Initialize search and category filter events.
 * Expects the following DOM elements to exist:
 *  - #searchInput: text input for searching by name
 *  - #categorySelect: a hidden <select> used as the authoritative value
 *  - a visible custom dropdown built from #categoryBtn and #categoryMenu
 */
export function initSearch() {
  const input = document.getElementById('searchInput');
  const select = document.getElementById('categorySelect');

  // --- wire custom dropdown (moved from inline script in index.html) ---
  // The visible dropdown mirrors the hidden select value. When changed,
  // we dispatch a `change` event on the select so other listeners can react.
  const btn = document.getElementById('categoryBtn');
  const menu = document.getElementById('categoryMenu');
  const label = document.getElementById('categoryLabel');

  if (btn && menu && select && label) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('li[data-value]');
      if (!item) return;
      const value = item.getAttribute('data-value');
      const text = item.textContent.trim();
      label.textContent = text;
      select.value = value;
      // dispatch change so existing listeners run
      select.dispatchEvent(new Event('change', { bubbles: true }));
      menu.classList.add('hidden');
    });

    // hide menu on outside click
    document.addEventListener('click', () => menu.classList.add('hidden'));
  }
  // --- end dropdown wiring ---

  // updateResults: read UI state, filter the cached locations, and re-render
  const updateResults = () => {
    const nameQuery = input.value.trim().toLowerCase();
    const category = select.value;

    // Defensive: getAllLocations returns an array loaded by markers.js
    const filtered = getAllLocations().filter(loc => {
      const matchesName = loc.name.toLowerCase().includes(nameQuery);
      const matchesCategory = category ? loc.category.toLowerCase() === category.toLowerCase() : true;
      return matchesName && matchesCategory;
    });

    // re-render the visible markers for the filtered set
    renderMarkers(filtered);

    // adjust map view to match the filtered results
    try {
      const map = getMapInstance();
      if (!map) return;

      if (filtered.length === 0) {
        // no results: keep current map view (optional: could reset)
        return;
      }

      if (filtered.length === 1) {
        // single result: center & zoom in for focus
        const loc = filtered[0];
        if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          map.setView([loc.lat, loc.lng], 13, { animate: true });
        }
        return;
      }

      // multiple results: fit bounds with padding and limit max zoom
      const latlngs = filtered.map(l => [l.lat, l.lng]);
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
    } catch (err) {
      // ignore errors (e.g., Leaflet not available yet)
    }
  };

  // debounce text input to avoid excessive re-renders while typing
  input.addEventListener('input', debounce(updateResults, 300));
  select.addEventListener('change', updateResults);
}