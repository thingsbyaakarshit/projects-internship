import { auth } from './firebase-config.js';
import { postBusinessIdea } from './firebase-functions.js';
import { dom } from './dom.js';
import { showToast } from './toast.js';

export function initPostIdea() {
  dom.submitIdeaBtn.addEventListener('click', async () => {
    const title = document.getElementById('ideaTitle').value;
    const description = document.getElementById('ideaDescription').value;
    const forReview = document.getElementById('ideaForReview').checked;
    try {
      await postBusinessIdea(auth.currentUser.uid, title, description, forReview);
      document.getElementById('ideaTitle').value = '';
      document.getElementById('ideaDescription').value = '';
      document.getElementById('ideaForReview').checked = false;
    } catch (e) { showToast(e.message, 'error'); }
  });
}
