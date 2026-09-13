// Lightweight Leaflet map wrapper
// Exports:
//  - initMap(): create and configure the Leaflet map instance
//  - getMapInstance(): return the cached map instance for other modules

let mapInstance = null;

/**
 * Initialize the Leaflet map and add minimal UI controls.
 * Important options:
 *  - minZoom: prevents zooming out too far for small datasets
 *  - zoomControl: disabled so we can provide compact custom controls
 *  - attributionControl: moved to bottom-left with condensed text
 *
 * Returns the created map instance (also cached in module scope).
 */
export function initMap() {
  // initialize map with modest zoom and minimal controls
  mapInstance = L.map('map', {
    center: [20.5937, 78.9629], // default world-ish center
    zoom: 3,
    minZoom: 3, // prevent zooming out too far
    zoomControl: false, // we'll add a compact control
    attributionControl: false
  });

  // Minimal light basemap (CartoDB Positron)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    noWrap: true // prevent horizontal wrapping of map tiles
  }).addTo(mapInstance);

  // prevent panning to other world copies — clamp to world bounds
  const worldBounds = [[-90, -180], [90, 180]];
  mapInstance.setMaxBounds(worldBounds);
  mapInstance.options.maxBoundsViscosity = 1.0;

  // minimal attribution in bottomleft
  L.control.attribution({ prefix: false, position: 'bottomleft' }).addAttribution('&copy; OpenStreetMap & Carto').addTo(mapInstance);

  // Custom compact controls: zoom in, zoom out, locate
  // This creates a small vertical stack of buttons in the bottom-right.
  const MapControls = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function (map) {
      const container = L.DomUtil.create('div', 'map-controls');

      // helper to generate a button with an inline svg icon
      const createBtn = (title, svg) => {
        const btn = L.DomUtil.create('button', 'map-btn', container);
        btn.type = 'button';
        btn.title = title;
        btn.innerHTML = svg;
        // stop clicks from propagating to the map (so they don't trigger drag/pan)
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      };

      const zoomInSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/></svg>';
      const zoomOutSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/></svg>';
      const locateSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M7 12a5 5 0 1010 0 5 5 0 00-10 0z"/></svg>';

      const zin = createBtn('Zoom in', zoomInSvg);
      const zout = createBtn('Zoom out', zoomOutSvg);
      const loc = createBtn('Show my location', locateSvg);

      zin.addEventListener('click', () => map.zoomIn());
      zout.addEventListener('click', () => {
        // guard against zooming past minZoom
        if (map.getZoom() > (map.getMinZoom ? map.getMinZoom() : 0)) {
          map.zoomOut();
        }
      });

      // ask browser for geolocation; Leaflet will emit 'locationfound' on success
      loc.addEventListener('click', () => {
        map.locate({ setView: true, maxZoom: 13 });
      });

      return container;
    }
  });

  mapInstance.addControl(new MapControls());

  // location marker handling: show a small circle when the user's location is found
  let _locMarker = null;
  mapInstance.on('locationfound', (e) => {
    if (_locMarker) _locMarker.remove();
    _locMarker = L.circleMarker(e.latlng, {
      radius: 8,
      color: '#059669',
      weight: 1.5,
      fillColor: '#bbf7d0',
      fillOpacity: 0.9
    }).addTo(mapInstance);
  });

  // on geolocation error we don't break the app; log to console for debugging
  mapInstance.on('locationerror', (err) => {
    console.warn('Location error:', err.message);
  });

  return mapInstance;
}

/**
 * Return the created Leaflet map instance.
 * Other modules import this to add layers/markers and to control view.
 */
export function getMapInstance() {
  return mapInstance;
}