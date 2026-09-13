import { auth, db } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { dom } from './dom.js';
import { appState } from './state.js';

// Install the notification bell toggle once. Guard with a flag on appState so
// repeated calls to setupNotifications don't register multiple listeners or
// cause inconsistent behavior across user roles.
if (!appState.notificationsToggleInstalled) {
  try {
    dom.notificationButton?.addEventListener('click', async (e) => {
      try {
        const panel = dom.notificationsPanel;
        const isHidden = panel.classList.contains('hidden');
        if (isHidden) {
          panel.classList.remove('hidden');
          appState.notificationsPanelVisible = true;
        } else {
          panel.classList.add('hidden');
          appState.notificationsPanelVisible = false;
        }

        // For investor/banker, hide the badge when they open the panel
        if (appState.currentUserData && (appState.currentUserData.userType === 'investor' || appState.currentUserData.userType === 'banker')) {
          const countEl = document.getElementById('notificationCount');
          if (countEl) { countEl.classList.add('hidden'); countEl.textContent = ''; }
        }

        // Additionally for banker/investor: persistently mark unread notifications as read so
        // the badge doesn't reappear on next login.
        if (appState.currentUserData && (appState.currentUserData.userType === 'banker' || appState.currentUserData.userType === 'investor') && auth.currentUser) {
          try {
            const unreadQ = query(collection(db, 'notifications'), where('recipientId', '==', auth.currentUser.uid), where('read', '==', false));
            const unreadSnap = await getDocs(unreadQ);
            for (const nd of unreadSnap.docs) {
              try {
                await updateDoc(doc(db, 'notifications', nd.id), { read: true });
              } catch (uErr) {
                console.warn('Failed to mark a notification read for banker:', uErr);
              }
            }
          } catch (qErr) {
            console.warn('Failed to query unread notifications for banker:', qErr);
          }
        }
      } catch (err) {
        console.warn('Error toggling notifications panel:', err);
      }
    });
    appState.notificationsToggleInstalled = true;
  } catch (e) {
    console.warn('Failed to install notifications toggle handler', e);
  }
}

export function setupNotifications(userId, appState) {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
  onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.slice().sort((a, b) => (new Date(b.data().createdAt).getTime() || 0) - (new Date(a.data().createdAt).getTime() || 0));
    const unreadCount = docs.filter(d => !d.data().read).length;
    const badge = document.getElementById('notificationCount');
    if (unreadCount > 0) { badge.textContent = unreadCount; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
    dom.notificationsList.innerHTML = '';
    docs.forEach(async (docSnapshot) => {
      const notification = docSnapshot.data();
      const notifId = docSnapshot.id;
      const el = document.createElement('div');
      el.className = `py-3 px-2 ${notification.read ? 'bg-white' : 'bg-gray-50'} `;

      // Resolve user display names — never show raw UID. Fall back to generic labels.
      let investorName = 'An investor';
      try {
        if (notification.investorId) {
          const invDoc = await getDoc(doc(db, 'users', notification.investorId));
          if (invDoc.exists()) investorName = invDoc.data().fullName || investorName;
        }
      } catch { investorName = 'An investor'; }

      let bankerName = 'A bank';
      try {
        if (notification.bankerId) {
          const bankDoc = await getDoc(doc(db, 'users', notification.bankerId));
          if (bankDoc.exists()) bankerName = bankDoc.data().fullName || bankerName;
        }
      } catch { bankerName = 'A bank'; }

      // content templates
      function renderLoan() {
        return `<div class="flex items-start justify-between">
            <div>
              <div class=\"text-sm font-medium text-black\">${notification.ideaTitle || 'Loan proposal'}</div>
              <div class=\"text-xs text-gray-600 mt-1\">${notification.amount ? `Amount: $${notification.amount}` : ''} ${notification.terms ? `• ${notification.terms}` : ''}</div>
              ${notification.bankerId ? `<div class=\"text-xs text-gray-400 mt-1\">From: ${bankerName}</div>` : ''}
            </div>
            <div class=\"text-xs text-gray-400\">${new Date(notification.createdAt).toLocaleDateString()}</div>
          </div>`;
      }
      function renderInterest() {
        return `<div class=\"flex items-start justify-between\"> <div>
            <div class=\"text-sm font-medium text-black\">${notification.ideaTitle || 'New notification'}</div>
            <div class=\"text-xs text-gray-600 mt-1\">${notification.type === 'interest_shown' ? `Investor ${investorName} showed interest` : ''}</div>
            ${notification.proposalText ? `<div class=\"text-sm mt-2 text-gray-700\">Proposal: ${notification.proposalText}</div>` : ''}
          </div>
          <div class=\"text-xs text-gray-400\">${new Date(notification.createdAt).toLocaleDateString()}</div>
        </div>`;
      }
      function renderIdeaForReview() {
        return `<p class=\"text-sm font-medium\">${notification.ideaTitle || 'Idea for review'}</p>
          <p class=\"text-sm mt-1 font-semibold\">Idea for review</p>
          <div class=\"text-sm mt-2 bg-gray-100 p-2 rounded\">${notification.message ? `<div>${notification.message}</div>` : ''}</div>
          <p class=\"text-xs text-gray-500 mt-1\">${new Date(notification.createdAt).toLocaleString()}</p>`;
      }
      function renderAdvisorReview() {
        return `<p class=\"text-sm font-medium\">${notification.ideaTitle || 'Advisor review'}</p>
          <p class=\"text-sm mt-1 font-semibold\">${notification.message || 'Advisor review'}</p>
          <p class=\"text-xs text-gray-500 mt-1\">${new Date(notification.createdAt).toLocaleString()}</p>`;
      }
      function renderProposalResponse() {
        return `<p class=\"text-sm font-medium\">${notification.ideaTitle || 'Proposal response'}</p>
          <p class=\"text-sm mt-1 font-semibold\">${notification.message || (notification.accepted ? 'Proposal was accepted' : 'Proposal was rejected')}</p>
          <p class=\"text-xs text-gray-500 mt-1\">${new Date(notification.createdAt).toLocaleString()}</p>`;
      }

      if (notification.type === 'loan_proposal') el.innerHTML = renderLoan();
      else if (notification.type === 'idea_for_review') el.innerHTML = renderIdeaForReview();
      else if (notification.type === 'advisor_review') el.innerHTML = renderAdvisorReview();
      else if (notification.type === 'proposal_response') el.innerHTML = renderProposalResponse();
      else el.innerHTML = renderInterest();

      el.style.cursor = 'pointer';
      // add unread indicator
      if (!notification.read) {
        const dot = document.createElement('span'); dot.className = 'inline-block h-2 w-2 bg-black rounded-full mr-2';
        el.prepend(dot);
      }
      // Treat 'idea_for_review' like other proposal notifications for the purposes
      // of disabling after a response so advisors can't interact with it again.
      const isProposalNotification = (notification.type === 'interest_shown' || notification.type === 'loan_proposal' || notification.type === 'idea_for_review');
      const hasBeenResponded = !!(notification.response || notification.responded || notification.respondedAt || notification.responderId || (typeof notification.accepted !== 'undefined' && notification.accepted !== null));
      if (isProposalNotification && hasBeenResponded) {
        el.classList.add('opacity-60');
        el.style.cursor = 'default';
        const badge = document.createElement('div'); badge.className = 'text-xs text-gray-400 mt-2'; badge.textContent = 'Responded'; el.appendChild(badge);
      }

      el.addEventListener('click', async () => {
        if (isProposalNotification && hasBeenResponded) return;
        const isEntrepreneurRecipient = (appState.currentUserData?.userType === 'entrepreneur') && (auth.currentUser?.uid === notification.recipientId);
        const isAdvisorViewingReview = (appState.currentUserData?.userType === 'advisor') && (notification.type === 'idea_for_review');
        if (!isEntrepreneurRecipient && !isAdvisorViewingReview) return;
        const titleEl = document.getElementById('notifModalTitle');
        titleEl.textContent = notification.ideaTitle || 'Notification';
        titleEl.className = 'text-lg font-medium text-black leading-tight mb-2';
        const body = document.getElementById('notifModalBody'); body.innerHTML = '';
        // Subtle modal body spacing and readable type scale
        body.className = 'space-y-4 text-sm text-gray-900';

        if (isEntrepreneurRecipient) {
          try {
            if (notification.type === 'advisor_review') {
              body.innerHTML = `<div class="text-sm text-gray-800">${notification.message || ''}</div>`;
            } else {
              // For entrepreneurs, if this is an interest/proposal notification prefer
              // to show the proposal body that the investor/banker submitted (proposalText)
              if (notification.type === 'interest_shown' && notification.proposalText) {
                body.innerHTML = `<div class="text-sm text-gray-800">${notification.proposalText || ''}</div>`;
              } else {
                if (notification.ideaId) {
                  const ideaDoc = await getDoc(doc(db, 'businessIdeas', notification.ideaId));
                  if (ideaDoc.exists()) { const idea = ideaDoc.data(); body.innerHTML = `<div class="text-sm text-gray-800">${idea.description || ''}</div>`; }
                  else body.innerHTML = '<div class="text-sm text-gray-600">Idea not found</div>';
                } else body.innerHTML = '<div class="text-sm text-gray-600">No idea content available</div>';
              }
            }
          } catch { body.innerHTML = '<div class="text-sm text-gray-600">Failed to load content</div>'; }
          const modal = document.getElementById('notificationModal'); modal.dataset.currentNotificationId = notifId;
          try { if (!notification.read) { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } } catch { }
          const acceptBtn = document.getElementById('notifAccept'); const rejectBtn = document.getElementById('notifReject');
          // Minimal black/shade buttons
          if (acceptBtn) acceptBtn.className = 'px-4 py-2 rounded-md text-white bg-black hover:bg-gray-900';
          if (rejectBtn) rejectBtn.className = 'px-4 py-2 rounded-md text-white bg-gray-800 hover:bg-gray-700';
          if (notification.type === 'interest_shown' || notification.type === 'loan_proposal') { if (acceptBtn) acceptBtn.style.display = 'inline-block'; if (rejectBtn) rejectBtn.style.display = 'inline-block'; } else { if (acceptBtn) acceptBtn.style.display = 'none'; if (rejectBtn) rejectBtn.style.display = 'none'; }
          document.getElementById('notificationModal').classList.remove('hidden');
          return;
        }

        // Advisor view for idea_for_review
        if (notification.type === 'idea_for_review') {
          try {
            const ideaDoc = await getDoc(doc(db, 'businessIdeas', notification.ideaId));
            if (ideaDoc.exists()) {
              const idea = ideaDoc.data();
              body.innerHTML = `<h4 class=\"font-semibold text-black\">${idea.title}</h4><p class=\"mt-2 text-sm text-gray-700\">${idea.description}</p><textarea id=\"advisorReviewText\" class=\"w-full p-3 border rounded mt-3 h-28\" placeholder=\"Review\"></textarea><div class=\"flex justify-end mt-3\"><button id=\"advisorSubmitReview\" class=\"px-4 py-2 bg-black text-white rounded-md\">Submit</button></div>`;
            } else body.innerHTML = '<p class="text-sm text-gray-600">Idea not found</p>';
          } catch { body.innerHTML = '<p class="text-sm text-gray-600">Failed to load idea</p>'; }
        }
        document.getElementById('notificationModal').dataset.currentNotificationId = notifId;
        document.getElementById('notifAccept').style.display = 'none';
        document.getElementById('notifReject').style.display = 'none';
        document.getElementById('notificationModal').classList.remove('hidden');
        if (appState.currentUserData?.userType === 'advisor' && notification.type === 'idea_for_review') {
          setTimeout(() => {
            const btn = document.getElementById('advisorSubmitReview');
            if (!btn) return;
            btn.addEventListener('click', async () => {
              const text = document.getElementById('advisorReviewText').value.trim();
              try {
                const mod = await import('./firebase-functions.js');
                await mod.sendAdvisorReview(auth.currentUser.uid, notification.ideaId, text || null);
                // Mark the original notification as responded/read so UI treats it as disabled
                try {
                  await updateDoc(doc(db, 'notifications', notifId), { read: true, responded: true, respondedAt: new Date().toISOString(), responderId: auth.currentUser.uid });
                } catch (uErr) {
                  console.warn('Failed to mark notification responded:', uErr);
                }
                document.getElementById('notificationModal').classList.add('hidden');
                // show toast instead of alert
                try { const { showToast } = await import('./toast.js'); showToast('Review submitted', 'success'); } catch (tErr) { console.warn('Toast failed', tErr); }
              } catch (e) { try { const { showToast } = await import('./toast.js'); showToast('Failed to submit review: ' + e.message, 'error'); } catch (tErr) { console.warn('Toast failed', tErr); } }
            });
          }, 50);
        }
      });
      dom.notificationsList.appendChild(el);
    });
  });

  // ...notification button handler installed once at module load...
}
