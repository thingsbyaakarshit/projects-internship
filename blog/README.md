# Testing New Blog

A small, static blog prototype built with plain HTML, ES modules and Tailwind CSS.

Core ideas:
- Static JSON data at `src/data/blogs.json` is fetched by client-side code.
- UI is styled with Tailwind CSS (source in `src/input.css`, built output `src/output.css`).
- Each blog card links to `pages/blog.html?id=<id>` which renders a Notion-like post view.
- Simple client-side features: username-only login modal (stored in `localStorage`) and per-post comments persisted in `localStorage`.

## Project structure (important files)

- `index.html` — blog listing page (grid of cards)
- `pages/blog.html` — single post template
- `src/modules/` — JS modules
  - `fetchData.js` — loads `src/data/blogs.json` via `fetch`
  - `renderData.js` — rendering logic for list + single post (banner probing, sanitization, layout)
  - `comments.js` — comments UI, stored under `comments_<postId>` in localStorage
  - `login.js` — minimal username-only login modal stored in `username` localStorage key
- `src/data/blogs.json` — source of posts (id, title, description, body, image)
- `assets/` — images and icons (e.g. `bg-1.jpg`, `face.svg`)
- `src/input.css` — Tailwind input file
- `src/output.css` — generated Tailwind output (ignored by `.gitignore` by default)

## Quick start

1. Install dependencies

```bash
npm install
```

2. Build Tailwind once (produces `src/output.css`)

```bash
npx tailwindcss -i src/input.css -o src/output.css --minify
```

3. For active development, run Tailwind in watch mode in one terminal and a static file server in another.

Tailwind watch:

```bash
npx tailwindcss -i src/input.css -o src/output.css --watch
```

Serve the project (examples):

```bash
# using serve (recommended simple server)
npx serve . -l 5000

# or using http-server
npx http-server -c-1 -p 5000

# or python 3 builtin server (works but no SPA-friendly options)
python3 -m http.server 5000
```

Open http://localhost:5000 in your browser.

Important: the site expects to be served from the project root so `fetch('/src/data/blogs.json')` and asset paths like `/assets/bg-1.jpg` resolve correctly.

## Development notes & troubleshooting

- Styles not appearing? Make sure `src/output.css` exists and your Tailwind build completes without errors.
- Banner images not showing? The renderer probes for common extensions when `image` in JSON is a base path (e.g. `assets/bg-1`). For guaranteed results, put the full filename (including extension) into `src/data/blogs.json` (recommended).
- If you change JSON or asset names, clear cache or restart the static server to avoid stale responses.

## Local persistence

- Logged-in username is saved in `localStorage` under key `username`.
- Comments are saved per-post under `comments_<id>` (JSON array). This is a local-only solution for the prototype.

## Suggested npm scripts (optional)

If you'd like, add these to `package.json` under `scripts` for convenience:

```json
"scripts": {
  "build:css": "npx tailwindcss -i src/input.css -o src/output.css --minify",
  "watch:css": "npx tailwindcss -i src/input.css -o src/output.css --watch",
  "serve": "npx serve . -l 5000"
}
```

Then you can run `npm run watch:css` in one terminal and `npm run serve` in another.

## Security & production notes

- This is a static, client-only prototype. Do not rely on the localStorage comments/login for any real authentication or persistence.
- For production, add a backend for comments and authentication, and serve optimized assets with proper caching headers.
