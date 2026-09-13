export default function initLogin() {
  return new Promise((resolve) => {
    try {
      const existing = localStorage.getItem('username');
      if (existing) {
        resolve(existing);
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';

      overlay.innerHTML = `
        <div class="bg-white rounded-3xl overflow-hidden max-w-sm mx-4 shadow-2xl ring-1 ring-gray-100">
          <!-- muted gradient banner -->
          <div class="h-28 bg-gradient-to-r from-rose-100 via-slate-100 to-emerald-100"></div>

          <div class="p-6">
            <h2 class="text-2xl font-extrabold text-gray-900 leading-tight">Enter to get new posts, reflections, and ideas straight to you</h2>
            <p class="text-sm text-gray-500 mt-2">How would you like to be called?</p>

            <div class="mt-4">
              <input id="login-username" class="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200" placeholder="Username" />
            </div>

            <div class="mt-5 flex justify-end">
              <button id="login-submit" class="bg-gray-900 text-white px-5 py-2 rounded-md w-full font-medium shadow-sm hover:bg-gray-800">Continue</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector('#login-username');
      const btn = overlay.querySelector('#login-submit');
      input.focus();

      const submit = () => {
        const val = input.value.trim();
        if (!val) {
          input.classList.add('ring-2', 'ring-red-300');
          return;
        }
        localStorage.setItem('username', val);
        overlay.remove();
        resolve(val);
      };

      btn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    } catch (e) {
      console.error('login init error', e);
      resolve(null);
    }
  });
}
