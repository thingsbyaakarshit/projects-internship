import { initializeMap, setMarker, clearMarker, getMap } from './map.js';

const geocodeCache = new Map();
let localCoords = null;

async function loadLocalCoords(path = './data/country_coords.json') {
  if (localCoords) return localCoords;
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    localCoords = await res.json();
    return localCoords;
  } catch (e) {
    // silently ignore — file may not exist
    return null;
  }
}

export async function fetchCountries(jsonPath = './data/top_ten_countries_depression.json') {
  const res = await fetch(jsonPath);
  if (!res.ok) throw new Error('Failed to load countries JSON');
  return res.json();
}

export async function renderCountryList(containerId = 'countriesList', jsonPath) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  try {
    const data = await fetchCountries(jsonPath);
    // ensure map exists
    initializeMap();

    // If there's at least one country, attempt to use available coordinates and focus it first
    if (data.length > 0) {
      const first = data[0];
      let coords = null;
      // prefer explicit coordinates in the JSON entry
      if (first.coordinates && (first.coordinates.latitude || first.coordinates.lat)) {
        coords = {
          lat: first.coordinates.latitude ?? first.coordinates.lat,
          lon: first.coordinates.longitude ?? first.coordinates.lon
        };
      }
      // try local coords file if not present on the item
      if (!coords) {
        const lc = await loadLocalCoords();
        if (lc && lc[first.country]) {
          coords = { lat: lc[first.country].lat, lon: lc[first.country].lon };
        }
      }
      if (coords && coords.lat != null && coords.lon != null) {
        setMarker(Number(coords.lat), Number(coords.lon), first);
      } else {
        // no coordinates available locally — skip geocoding to avoid CORS issues
        console.warn('No local coordinates for initial country:', first.country);
      }
    }
    data.forEach(item => {
      const el = document.createElement('div');
      el.className = 'country-item p-3 rounded-lg border border-gray-200';
      el.textContent = item.country;

      el.addEventListener('click', async () => {
        // Prefer coordinates packaged with the item, then local coords file. Do not call external geocode (CORS).
        let coords = null;
        if (item.coordinates && (item.coordinates.latitude || item.coordinates.lat)) {
          coords = {
            lat: item.coordinates.latitude ?? item.coordinates.lat,
            lon: item.coordinates.longitude ?? item.coordinates.lon
          };
        }
        if (!coords) {
          const lc = await loadLocalCoords();
          if (lc && lc[item.country]) coords = { lat: lc[item.country].lat, lon: lc[item.country].lon };
        }

        if (coords && coords.lat != null && coords.lon != null) {
          setMarker(Number(coords.lat), Number(coords.lon), item);
          // visual selection
          document.querySelectorAll('.country-item').forEach(n => n.classList.remove('bg-blue-100'));
          el.classList.add('bg-blue-100');
        } else {
          console.warn('No coordinates available for', item.country, '- skipping geocode to avoid CORS');
        }
      });

      container.appendChild(el);
    });
    // after appending, highlight the first country if present
    const firstItem = container.querySelector('.country-item');
    if (firstItem) firstItem.classList.add('bg-blue-100');
  } catch (err) {
    console.error('renderCountryList error', err);
  }
}

async function geocodeCountry(name) {
  if (geocodeCache.has(name)) return geocodeCache.get(name);
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`);
  if (!resp.ok) throw new Error('Geocode request failed');
  const json = await resp.json();
  if (!json || !json.length) return null;
  const result = { lat: json[0].lat, lon: json[0].lon };
  geocodeCache.set(name, result);
  return result;
}
