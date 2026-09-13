# Bridge — Developer Quickstart

Minimal single-page app built with plain ES modules, Tailwind CSS, and Firebase (Auth + Firestore).

This README helps you get the project running locally, configure Firebase, and perform quick smoke tests for the main flows (auth, post idea, proposals, notifications, toasts).

## Checklist
- [ ] Node.js (>=16) installed
- [ ] Firebase project created with Auth + Firestore enabled
- [ ] `src/firebase-config.js` populated with your Firebase config
- [ ] Tailwind built to `src/output.css` (dev: watch mode)

## Tech
- Vanilla HTML + ES modules (no JS bundler required)
- Tailwind CSS for styling (`src/input.css` -> `src/output.css`)
- Firebase Auth + Firestore

## Quick setup
1. Install optional dev dependencies (recommended):

```bash
npm install
```

2. Build Tailwind (dev / watch)

```bash
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch
```

Leave that running while you develop so `src/output.css` updates.

3. Serve the site locally (static server)

```bash
npx http-server . -c-1 -p 8080
# or
npx serve . -l 8080
```

Open http://localhost:8080 in your browser.

## Firebase configuration
1. Create a Firebase project at https://console.firebase.google.com.
2. Enable Authentication providers you need (Email/Password, Google, etc.).
3. Create a Firestore database (for dev you can use test mode).
4. Copy the Firebase config (apiKey, authDomain, projectId, etc.) into `src/firebase-config.js`.

Example snippet inside `src/firebase-config.js`:

```js
// ... imports ...
const firebaseConfig = {
  apiKey: "<YOUR_API_KEY>",
  authDomain: "<YOUR_AUTH_DOMAIN>",
  projectId: "<YOUR_PROJECT_ID>",
  // other keys...
};
// initialize app, export `auth` and `db`
```

### Collections used
- `users` — user profiles (document contains fullName, userType, etc.)
- `businessIdeas` — idea documents; subcollections: `proposals` / `loanProposals`
- `notifications` — per-user notifications
- `logs` (optional) — client logs

## Developer workflow & smoke tests
- Ensure Tailwind watch is running and the static server is serving the project.
- Use the UI to sign up / sign in.

Smoke test flows:
- As an entrepreneur:
  - Post a business idea using the Post Idea form (visible to entrepreneurs).
  - Verify the idea appears in the feed.
- As an investor / banker:
  - Open the feed, show interest or submit a loan proposal on an idea.
  - A `notifications` document should be created for the idea owner and include `proposalText` when applicable.
- Notifications:
  - Click the bell to open the notifications panel.
  - When the entrepreneur opens an `interest_shown` notification it should display the proposal text (if provided).
  - Accept/Reject buttons appear for entrepreneur on proposal notifications.
- Toasts:
  - UI uses toasts (bottom-right) for status messages instead of `alert()`.

## Useful commands
```bash
# Install (optional)
npm install

# Build Tailwind once
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css

# Watch Tailwind while developing
npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css --watch

# Serve locally
npx http-server . -c-1 -p 8080
```

## Troubleshooting
- Blank page / module errors: check DevTools console for 404s or import errors.
- Tailwind classes not applied: ensure `src/output.css` exists and is linked in `index.html`. Run the Tailwind build command.
- Firebase errors: confirm `src/firebase-config.js` contains the correct config and that Auth/Firestore are enabled.
- Firestore write/read permission errors: inspect Firestore rules (for dev you can loosen rules temporarily).
- Notifications not appearing: check the `notifications` collection in the Firestore console.

