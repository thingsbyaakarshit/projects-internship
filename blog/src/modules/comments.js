// Simple client-side comments module using localStorage per post
(function () {
  function getId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function getStorageKey(id) {
    return `comments_${id}`;
  }

  function loadComments(id) {
    try {
      const raw = localStorage.getItem(getStorageKey(id));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveComments(id, comments) {
    localStorage.setItem(getStorageKey(id), JSON.stringify(comments));
  }

  function timeAgo(ts) {
    const delta = Math.floor((Date.now() - ts) / 1000);
    if (delta < 60) return `${delta}s`;
    if (delta < 3600) return `${Math.floor(delta / 60)}m`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
    return `${Math.floor(delta / 86400)}d`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render(commentsContainer, id) {
    const comments = loadComments(id);
    const list = commentsContainer.querySelector('.comments-list');
    if (!list) return;
    list.innerHTML = '';

    if (comments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm text-gray-500 p-4';
      empty.textContent = 'No comments yet. Be the first to share your thoughts.';
      list.appendChild(empty);
      return;
    }

    comments.forEach(c => {
      const item = document.createElement('div');
      item.className = 'py-4 border-b border-gray-100';
      item.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">${escapeHtml(c.author.charAt(0) || 'U')}</div>
          <div class="flex-1">
            <div class="flex items-center justify-between gap-4">
              <div class="text-sm font-medium text-gray-900">@${escapeHtml(c.author)}</div>
              <div class="text-xs text-gray-400">${timeAgo(c.ts)} ago</div>
            </div>
            <div class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(c.text)}</div>
          </div>
        </div>
      `;
      list.appendChild(item);
    });
  }

  function init() {
    const id = getId();
    if (!id) return; // only run on post pages

    const container = document.getElementById('comments');
    if (!container) return;

    container.innerHTML = `
      <div class="h-full flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <div class="text-lg font-semibold text-gray-900">Comments</div>
        </div>

        <div class="flex-1 overflow-auto p-3">
          <div class="comments-list"></div>
        </div>

        <div class="p-4 border-t border-gray-100 bg-white">
          <div class="text-xs text-gray-500 mb-2">Signed in as <span id="comment-author" class="font-medium"></span></div>
          <textarea id="comment-text" rows="3" class="w-full border border-gray-200 rounded-md px-3 py-2 text-sm placeholder-gray-400 resize-none" placeholder="Post a Comment"></textarea>
          <div class="mt-3">
            <button id="comment-submit" class="w-full bg-black text-white px-4 py-2 rounded-xl text-sm">Post</button>
          </div>
        </div>
      </div>
    `;

    const authorEl = container.querySelector('#comment-author');
    const textEl = container.querySelector('#comment-text');
    const submitBtn = container.querySelector('#comment-submit');

    const storedAuthor = localStorage.getItem('username') || 'Anonymous';
    authorEl.textContent = storedAuthor;

    const commentsListEl = container.querySelector('.comments-list');

    function refresh() {
      render(container, id);
    }

    submitBtn.addEventListener('click', () => {
      const text = textEl.value.trim();
      if (!text) return;
      const comments = loadComments(id);
      comments.unshift({ author: storedAuthor, text, ts: Date.now() });
      saveComments(id, comments);
      textEl.value = '';
      refresh();
      // scroll to top of comments
      if (commentsListEl.firstChild) commentsListEl.firstChild.scrollIntoView({ behavior: 'smooth' });
    });

    // initial render
    refresh();
  }

  // run on DOMContentLoaded if the module is imported early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
