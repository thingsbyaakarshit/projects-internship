import { initializeMap } from './src/modules/map.js';
import { renderCountryList } from './src/modules/countries.js';
import { renderHomeChart } from './src/modules/homeChart.js';
import { renderAgePie } from './src/modules/agePie.js';

// Function to load an HTML file into the #app div
export async function loadPage(page) {
  try {
    const response = await fetch(`./pages/${page}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load page: ${page}`);
    }
    const htmlContent = await response.text();
    document.getElementById('app').innerHTML = htmlContent;

    if (page === 'chart') {
      // Initialize map and country list after DOM is updated
      // Use requestAnimationFrame to ensure elements are painted
      requestAnimationFrame(() => {
        initializeMap();
        renderCountryList('countriesList', './data/top_ten_countries_depression.json');
      });
    }

    if (page === 'home') {
      requestAnimationFrame(() => {
        renderHomeChart('homeChart', './data/mental_health_vs_screen_use.json');
        renderAgePie('agePieChart', './data/age_wise_depression.json');
      });
    }
  } catch (error) {
    console.error(error);
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<p>Error loading page: ${error.message}</p>`;
  }
}

// Simple hash-based router: #/home or #/chart
function routeFromHash() {
  const hash = window.location.hash || '';
  const page = hash.startsWith('#/') ? hash.slice(2) : hash ? hash.slice(1) : '';
  return page || 'chart'; // default to 'chart' to match previous behavior
}

function handleRoute() {
  const page = routeFromHash();
  loadPage(page);
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', handleRoute);

// Also expose loadPage if other modules want to programmatically change pages
export { handleRoute as navigateToHash };
