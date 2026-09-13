export let map = null;
export let currentMarker = null;

export function initializeMap(elementId = 'map') {
  // If a map instance already exists, ensure it's attached to the current container.
  const existingContainer = map && map.getContainer && map.getContainer();
  const desiredContainer = document.getElementById(elementId);
  if (map) {
    if (existingContainer === desiredContainer) {
      // map already initialized on the correct container
      try { map.invalidateSize(); } catch (e) { /* ignore */ }
      return map;
    }
    // remove previous map instance because the DOM was replaced
    try { map.remove(); } catch (e) { /* ignore */ }
    map = null;
  }

  // Leaflet `L` is expected to be available globally (index.html includes the script)
  // Minimal UI: hide default zoom and attribution controls, disable scroll zoom
  map = L.map(elementId, {
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    dragging: true
  }).setView([0, 0], 2);

  // Minimal tile layer — CartoDB Positron (light) for a clean, minimal basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    detectRetina: true
  }).addTo(map);

  // ensure tiles render correctly after insertion into the DOM
  setTimeout(() => {
    try { map.invalidateSize(); } catch (e) { /* ignore */ }
  }, 200);

  return map;
}

export function setMarker(lat, lon, countryData) {
  if (!map) initializeMap();
  // Remove existing marker safely
  if (currentMarker) {
    try { map.removeLayer(currentMarker); } catch (e) { /* ignore */ }
  }

  // Normalize coordinates: prefer explicit args, then check a few common shapes on countryData
  let _lat = (typeof lat === 'number') ? lat : null;
  let _lon = (typeof lon === 'number') ? lon : null;

  if ((_lat === null || _lon === null) && countryData) {
    const c = countryData.coordinates || countryData.coords || {};
    const tryVal = v => (v === undefined || v === null) ? null : Number(v);

    _lat = _lat ?? tryVal(c.latitude) ?? tryVal(c.lat) ?? tryVal(countryData.latitude) ?? tryVal(countryData.lat);
    _lon = _lon ?? tryVal(c.longitude) ?? tryVal(c.lon) ?? tryVal(countryData.longitude) ?? tryVal(countryData.lon);

    // normalize NaN -> null
    if (Number.isNaN(_lat)) _lat = null;
    if (Number.isNaN(_lon)) _lon = null;
  }

  // If we still don't have valid coordinates, bail gracefully to avoid mobile errors
  if (_lat === null || _lon === null) {
    // ensure there's no dangling marker
    currentMarker = null;
    console.warn('setMarker: no valid coordinates for', countryData && countryData.country);
    return;
  }

  // Use a minimal, unobtrusive circle marker instead of the default pin
  currentMarker = L.circleMarker([_lat, _lon], {
    radius: 6,
    color: '#2563eb', // blue-600
    weight: 1,
    fillColor: '#2563eb',
    fillOpacity: 0.9
  });

  // Add tooltip with country data if available
  if (countryData) {
    const tooltipContent = `
      <div class="font-semibold">${countryData.country}</div>
      <div class="text-sm">
        <div>Depression: ${countryData.depression}%</div>
        <div>Anxiety: ${countryData.anxiety}%</div>
        <div>Year: ${countryData.year}</div>
      </div>
    `;
    try {
      currentMarker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        className: 'bg-white shadow-lg rounded px-2 py-1'
      });
    } catch (e) {
      // binding tooltip shouldn't block marker creation
    }
  }

  try {
    currentMarker.addTo(map);
  } catch (e) {
    console.warn('Unable to add marker to map:', e);
    return;
  }

  // Center map safely. Some mobile environments throw if map isn't fully sized
  try {
    map.setView([_lat, _lon], 5, { animate: true, duration: 0.5 });
    // ensure tiles display correctly on mobile after view change
    setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 250);
  } catch (e) {
    // fallback: try a safer flyTo or ignore if both fail
    try {
      map.flyTo([_lat, _lon], 5, { animate: true, duration: 0.5 });
      setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 250);
    } catch (err) {
      console.warn('Failed to center map on mobile view:', err);
    }
  }
}

export function clearMarker() {
  if (currentMarker && map) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }
}

export function getMap() {
  return map;
}
