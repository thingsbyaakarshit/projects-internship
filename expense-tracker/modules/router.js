// Router module - handles loading page fragments into #app and firing a callback after load
export function startRouter(onPageLoaded) {
  const app = document.getElementById('app');

  async function loadPage(page) {
    try {
      const res = await fetch(`./pages/${page}.html`, { cache: 'no-store' });
      if (!res.ok) throw new Error('not found');
      const html = await res.text();
      app.innerHTML = html;
      if (typeof onPageLoaded === 'function') onPageLoaded(page);
    } catch (err) {
      app.innerHTML = `<div class="p-8 bg-white rounded-2xl"> <h3 class="text-lg">404</h3><p class="text-sm text-gray-600">Page ${page} not found</p></div>`;
    }
  }

  function getRoute() {
    return location.hash.replace(/^#\/?/, '') || 'home';
  }

  window.addEventListener('hashchange', () => loadPage(getRoute()));
  window.addEventListener('load', () => loadPage(getRoute()));

  // return a small API if consumer wants to programmatically navigate
  return { loadPage, getRoute };
}
