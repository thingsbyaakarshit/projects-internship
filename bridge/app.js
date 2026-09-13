// Modular bootstrap
import { initAuthUI } from './src/auth-ui.js';
import { initPostIdea } from './src/post-idea.js';

// Initialize feature modules
initAuthUI();
initPostIdea();

// Notification modal logic remains separated in its own file `src/notification-modal.js` which is imported via script tag.