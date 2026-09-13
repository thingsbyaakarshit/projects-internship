# Low-Level Design (LLD)

This document briefly explains the role of each file in the project, key functions/exports, DOM hooks, and Firestore data expectations. It's intended for a developer who needs to understand responsibilities and touch points quickly.

## Top-level
- `index.html`
  - App shell and DOM. Contains IDs referenced by JS (e.g. `notificationButton`, `notificationCount`, `notificationsPanel`, `notificationModal`, `notifModalBody`, `notifModalTitle`, `notifAccept`, `notifReject`, `postIdeaForm`, etc.). Load order: includes `src/output.css` and the main `app.js` (or module imports).
- `app.js`
  - Entry script that wires modules together (auth, feed, notifications, post-idea). Initializes `appState` and calls setup/init methods. Keeps bootstrapping logic minimal.
- `package.json`
  - NPM metadata and scripts (if present). Useful to add `build:css`, `watch:css`, `start` scripts.
- `README.md` / `.gitignore`
  - Project README and ignore rules (housekeeping).

## `src/` (modules)
Each module exports small functions used by `app.js`. Modules are plain ES modules and use browser-native imports.

- `src/firebase-config.js`
  - Initializes Firebase SDK, exports `auth` and `db`. Replace placeholder config with your project's values.
  - Important: used by all Firestore/auth operations.

- `src/firebase-functions.js`
  - Thin client-side abstraction over Firestore writes used by the UI (e.g. `postBusinessIdea`, `showInterest`, `sendLoanProposal`, `respondToProposal`, `sendAdvisorReview`, `ensureUserDoc`, `logClientAction`).
  - Contracts: these functions create documents in collections `businessIdeas`, `businessIdeas/{ideaId}/proposals`, `notifications`, and `logs`.

- `src/state.js`
  - Exports `appState` — a small shared object used by modules for flags (e.g. `notificationsToggleInstalled`, `notificationsPanelVisible`, `currentUserData`). Use it for lightweight cross-module coordination only.

- `src/dom.js`
  - Centralizes lookups for common DOM elements (exports `dom` with refs to `notificationsPanel`, `notificationsList`, `notificationButton`, etc.). Keeps modules from repeating `getElementById` calls.

- `src/toast.js`
  - UI utility: `showToast(message, type, duration)` renders non-blocking toasts (bottom-right). Replaces `alert()` usage.
  - Styling: compact black base + accent border by type; includes manual dismiss and auto-dismiss.

- `src/auth-ui.js`
  - Handles sign-in / sign-up UI, listens to `auth` state changes, resolves user profile docs, and populates `appState.currentUserData`.
  - Ensures `postIdeaForm` visibility depends on user role (entrepreneur). Exports setup/init for auth UI.

- `src/post-idea.js`
  - Post idea form handling. Uses `firebase-functions` to create idea documents and shows toasts on success/failure.
  - Preserves idea form IDs expected by HTML (e.g. `postIdeaForm`, `ideaTitle`, `ideaDescription`).

- `src/ideas-feed.js`
  - Renders the ideas feed and handles investor/banker actions (show interest, loan proposals).
  - Prevents duplicate proposals via UI disables and re-checks Firestore before writing. Adds proposal documents under `businessIdeas/{ideaId}/proposals`.
  - Key behaviors: disables proposal buttons for users who already proposed.

- `src/notifications.js`
  - Subscribes to Firestore `notifications` (where `recipientId == currentUserId`) and renders the panel (`dom.notificationsList`).
  - Key fields expected on notification docs: `type` (e.g. `interest_shown`, `loan_proposal`, `advisor_review`, `idea_for_review`, `proposal_response`), `recipientId`, `createdAt`, `read` (boolean), `ideaId`, `proposalText`, `investorId`/`bankerId`, `ideaTitle`, `message`, and response metadata (`responded`, `responderId`, `respondedAt`, `accepted`).
  - Behavior: entrepreneur opening `interest_shown` sees `proposalText` (fallback to idea description). Advisor `idea_for_review` flow renders a textarea and calls `sendAdvisorReview`.
  - Marks notifications read when appropriate and visually indicates `Responded` for handled items.

- `src/notification-modal.js`
  - Small helper to centralize modal accept/reject handlers; may import `firebase-functions` to persist responses.

## Data shapes / Contracts (Firestore)
- `users/{userId}`
  - Expected fields: `fullName`, `userType` (one of `entrepreneur`|`investor`|`banker`|`advisor`), plus optional profile data.
- `businessIdeas/{ideaId}`
  - Fields: `title`, `description`, `ownerId`, `createdAt`, etc.
  - Subcollections: `proposals` (investor proposals) and `loanProposals` (banker loans). Items typically include `fromId`, `text`, `amount`, `terms`, `createdAt`.
- `notifications/{notifId}`
  - Fields used by UI: `type`, `recipientId`, `createdAt`, `read` (bool), `ideaId`, `ideaTitle`, `proposalText` (optional), `investorId`/`bankerId`, `message`, and response flags (`responded`, `responderId`, `respondedAt`, `accepted`).

## Important DOM IDs and UI contracts
These IDs are referenced across modules and should not be renamed without updating JS:
- `notificationButton`, `notificationCount`, `notificationsPanel`, `notificationsList`, `notificationModal`, `notifModalBody`, `notifModalTitle`, `notifAccept`, `notifReject`, `postIdeaForm` (and its fields), `proposalText`, `proposalSubmit`, `advisorReviewText`, `advisorSubmitReview`.

## Error and edge cases
- Network / Firestore errors: modules catch and show toasts; consider centralizing error handling for consistent UX.
- Duplicate proposal prevention: currently enforced client-side with a Firestore re-check; stronger guarantee requires server-side transactions or Cloud Functions.
- Notification race conditions: marking read is attempted but not strongly transactional — consider idempotency keys and server-side logic for critical flows.

## Extension points and recommendations
- Centralize Firestore queries (small data-access layer) to ease unit testing and reuse.
- Add `package.json` scripts: `build:css`, `watch:css`, `start` (concurrently run Tailwind and a static server).
- Add unit/smoke tests via Firebase emulator for critical flows (proposals, notifications).
- Improve accessibility: ensure modals trap focus and toast buttons are reachable by keyboard.


