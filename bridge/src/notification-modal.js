import { respondToProposal, logClientAction } from './firebase-functions.js';
import { auth } from './firebase-config.js';
import { showToast } from './toast.js';

const notificationModal = document.getElementById('notificationModal');

// Close modal when clicking outside the content
notificationModal.addEventListener('click', async (e) => {
  if (e.target === notificationModal) {
    notificationModal.classList.add('hidden');
    const notifId = notificationModal.dataset.currentNotificationId;
    try {
      if (auth?.currentUser?.uid) {
        await logClientAction('notification_modal_dismiss', { userId: auth.currentUser.uid, notificationId: notifId });
      }
    } catch (err) {
      console.warn('Failed to log modal dismiss', err);
    }
  }
});

document.getElementById('notifAccept').addEventListener('click', async () => {
  const notifId = document.getElementById('notificationModal').dataset.currentNotificationId;
  if (!notifId) return;
  try {
    const responderId = auth?.currentUser?.uid;
    await respondToProposal(notifId, responderId, 'accept');
    // log client-side event for analytics/audit
    try {
      await logClientAction('entrepreneur_accept_proposal', { entrepreneurId: responderId, notificationId: notifId, response: 'accept' });
    } catch (e) {
      console.warn('Failed to log accept action', e);
    }
    document.getElementById('notificationModal').classList.add('hidden');
    showToast('Proposal accepted', 'success');
  } catch (e) {
    console.error(e);
    showToast('Failed to accept proposal: ' + e.message, 'error');
  }
});

document.getElementById('notifReject').addEventListener('click', async () => {
  const notifId = document.getElementById('notificationModal').dataset.currentNotificationId;
  if (!notifId) return;
  try {
    const responderId = auth?.currentUser?.uid;
    await respondToProposal(notifId, responderId, 'reject');
    try {
      await logClientAction('entrepreneur_reject_proposal', { entrepreneurId: responderId, notificationId: notifId, response: 'reject' });
    } catch (e) {
      console.warn('Failed to log reject action', e);
    }
    document.getElementById('notificationModal').classList.add('hidden');
    showToast('Proposal rejected', 'info');
  } catch (e) {
    console.error(e);
    showToast('Failed to reject proposal: ' + e.message, 'error');
  }
});