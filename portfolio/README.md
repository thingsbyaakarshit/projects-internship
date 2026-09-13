# .me. — Personal Portfolio

![Project preview](./assets/project-images/project-portfolio.png)

A minimal, aesthetic personal portfolio built with plain HTML, Tailwind CSS, and vanilla JavaScript. Projects are loaded from a JSON file and the contact form stores submissions locally (client-side).

## Table of contents

- [Quick start](#quick-start)
- [What this repo contains](#what-this-repo-contains)
- [Projects and images](#projects-and-images)
- [Contact form](#contact-form)
- [Development notes](#development-notes)

---

## Quick start

1. (Optional) Install dependencies if you use Tailwind locally:

   ```bash
   npm install
   ```

2. (Optional) Build Tailwind while developing styles:

   ```bash
   npx tailwindcss -i ./src/input.css -o ./src/output.css --watch
   ```

3. Serve the project (simple and fast preview):

   ```bash
   # from the project root
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

---

## What this repo contains

- `index.html` — main entry. Contains the hero, projects container and shell that lazy-loads `about` and `footer` partials.

- `pages/about.html` — about section content injected into the page.

- `pages/projects.html` — (not required; projects are loaded dynamically into `#projectsContainer` from `data/projects.json`).

- `components/footer.html` — contact form and footer content (loaded dynamically).

- `data/projects.json` — project data used by the projects loader (title, description, tech, image).

- `modules/loadProjects.js` — loads `data/projects.json` and renders project cards into `#projectsContainer`.

- `modules/footerForm.js` — client-side form validation and saves submissions to `localStorage`.

- `main.js` — application bootstrapping and partial-loading logic.

- `src/output.css` — generated Tailwind CSS output (ignored by `.gitignore`).

- `assets/` — images and icons used by the site.

---

## Projects and images

Projects are defined in `data/projects.json`. Each project can include an `image` field which is used by `modules/loadProjects.js`.

Example project entry:

```json
{
  "title": "Expense Tracker",
  "description": "An application to track expenses and income...",
  "tech": "HTML, TailwindCSS, JavaScript, Chart.js",
  "image": "./assets/project-images/project-expense.png"
}
```

Place image files under `assets/project-images/` (or update the `image` path in the JSON) to have them rendered on the project cards.

---

## Contact form

The footer contact form validates fields client-side and appends submissions to `localStorage` under the key `contactSubmissions`.

If you want server-side handling, replace the commented-out `fetch` in `modules/footerForm.js` with your API endpoint.

---

## Development notes

- The site uses vanilla JS modules — open in a local server (not `file://`) so `import` and `fetch` work correctly.
- Tailwind is prebuilt to `src/output.css`. If you change Tailwind input files, rebuild to update `src/output.css`.
- The `.gitignore` excludes `src/output.css` so generated CSS isn't checked in by default.

