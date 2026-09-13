import fetchBlogs from './fetchData.js';

export function renderBlogsCard() {
  const blogContainer = document.getElementById('blog-posts');
  if (!blogContainer) {
    console.error('Blog container not found');
    return;
  }

  fetchBlogs().then(blogs => {
    blogContainer.innerHTML = ''; // Clear existing content
    blogs.forEach(blog => {
      const blogCard = document.createElement('div');
      blogCard.className = 'blog-card h-full';

      blogCard.innerHTML = `
        <a href="/pages/blog.html?id=${blog.id}" class="block h-full text-current no-underline">
          <article class="bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
            <div>
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <h3 class="text-2xl font-extrabold text-gray-900 leading-tight">${blog.title}</h3>
                </div>
              </div>

              <p class="text-gray-600 mt-4 text-sm/relaxed">${blog.description}</p>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span class="inline-flex items-center justify-center bg-black text-white text-sm font-medium px-4 py-2 rounded-md">Read more</span>
              <div class="text-sm text-gray-400">&nbsp;</div>
            </div>
          </article>
        </a>
      `;

      blogContainer.appendChild(blogCard);
    });
  }).catch(error => {
    console.error('Error fetching blogs:', error);
  });
}

// --- Render single blog post page ---

function getIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

export async function renderBlogPost() {
  // only run when the blog post template elements are present
  const articleEl = document.getElementById('post');
  if (!articleEl) return;

  const id = getIdFromQuery();
  if (!id) {
    articleEl.innerHTML = '<div class="p-6">Post not found</div>';
    return;
  }

  try {
    const blogs = await fetchBlogs();
    const post = blogs.find(b => String(b.id) === String(id));
    if (!post) {
      articleEl.innerHTML = '<div class="p-6">Post not found</div>';
      return;
    }

    // render banner into the separate banner container if present
    const bannerEl = document.getElementById('post-banner');
    if (bannerEl) {
      // try a set of common extensions; if none exist, use muted gradient fallback
      async function findImage(base) {
        const exts = ['png', 'jpg', 'webp'];
        for (const ext of exts) {
          const url = `/${base}.${ext}`;
          const ok = await new Promise(res => {
            const img = new Image();
            img.onload = () => res(true);
            img.onerror = () => res(false);
            img.src = url;
          });
          if (ok) return url;
        }
        return null;
      }

      if (post.image) {
        const found = await findImage(post.image);
        if (found) {
          bannerEl.style.backgroundImage = `url('${found}')`;
          bannerEl.style.backgroundSize = 'cover';
          bannerEl.style.backgroundPosition = 'center';
        } else {
          bannerEl.className = 'w-full h-72 rounded-2xl overflow-hidden bg-gradient-to-r from-rose-50 via-slate-50 to-emerald-50';
        }
      } else {
        bannerEl.className = 'w-full h-72 rounded-2xl overflow-hidden bg-gradient-to-r from-rose-50 via-slate-50 to-emerald-50';
      }
    }

    const contentHtml = `
      <div class="max-w-3xl mx-auto">
        <header class="mb-6">
          <h1 id="post-title" class="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-3">${escapeHtml(post.title)}</h1>
          <p id="post-desc" class="text-gray-500 text-base md:text-lg">${escapeHtml(post.description || '')}</p>
        </header>

        <div class="prose text-gray-800">${(post.body || '').split('\n\n').map(p => '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>').join('')}</div>
      </div>
    `;

    articleEl.innerHTML = contentHtml;
  } catch (e) {
    articleEl.innerHTML = '<div class="p-6">Error loading post</div>';
    console.error(e);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}