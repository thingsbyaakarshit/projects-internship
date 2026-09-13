const toastContainerId = 'bridge-toast-container';

function ensureToastContainer() {
  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement('div');
    container.id = toastContainerId;
    container.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = 'info', duration = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  let color = 'bg-gray-800';
  let icon = '';
  if (type === 'success') { color = 'bg-green-600'; icon = '✔️'; }
  else if (type === 'error') { color = 'bg-red-600'; icon = '❌'; }
  else if (type === 'info') { color = 'bg-blue-600'; icon = 'ℹ️'; }
  toast.className = `${color} text-white px-4 py-2 rounded shadow flex items-center space-x-2 animate-fade-in`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => container.removeChild(toast), 400);
  }, duration);
}


