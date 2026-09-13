# Expense Tracker

A simple client-side Expense Tracker web app. It uses plain HTML, CSS and JavaScript organized into small modules and pages to record and visualize expenses.

## Features
- Add, view and categorize transactions (client-side).
- Simple chart page for visualizing expenses.
- Modular JavaScript split under `modules/` for routing, transactions and chart logic.

## Tech stack
- HTML/TailwindCSS/JavaScript (vanilla)
- Uses assets in `assets/` for icons and images

## Project structure
- `index.html` — app entry page
- `main.js` — application bootstrap / entry JavaScript
- `styles.css` — global styles (source when using a CSS tool like Tailwind)
- `modules/` — JavaScript modules (e.g., `chart.js`, `router.js`, `tx.js`)
- `pages/` — HTML partials/pages (`home.html`, `chart.html`)
- `assets/` — images and icons
- `src/output.css` — generated CSS output (built from `styles.css` when using Tailwind or another tool)

## How to run
This is a static web app. You can open `index.html` directly in a browser, or serve it with a local static server for a better development experience (recommended).

Open directly:

```bash
# macOS: double-click index.html or open in browser from Finder
open index.html
```

Install dependencies (if the repository has a `package.json` and you plan to use Node tools like `npx` or Tailwind):

```bash
npm install
```

Serve with Python 3 (simple):

```bash
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

If you're using Tailwind CSS to author your styles and `src/output.css` is generated from `styles.css`, run the Tailwind CLI during development to build and watch styles:

```bash
npx @tailwindcss/cli -i ./styles.css -o ./src/output.css --watch
```

## Development notes
- Edit UI and pages in `pages/` and `styles.css` 
- App logic lives in `modules/`:
  - `router.js` — client-side routing
  - `tx.js` — transaction handling
  - `chart.js` — chart rendering
- If `src/output.css` is generated (e.g., from a preprocessor or Tailwind), regenerate it with the Tailwind CLI while developing:

  ```bash
  npx @tailwindcss/cli -i ./styles.css -o ./src/output.css --watch
  ```



