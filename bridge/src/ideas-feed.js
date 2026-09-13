import { auth, db } from './firebase-config.js';
import { showInterest, logClientAction, sendLoanProposal } from './firebase-functions.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { dom } from './dom.js';
import { showToast } from './toast.js';

export function setupIdeasFeed(appState) {
  const q = query(collection(db, 'businessIdeas'), orderBy('createdAt', 'desc'));
  onSnapshot(q, async (snapshot) => {
    dom.ideasFeed.innerHTML = '';
    for (const ideaSnap of snapshot.docs) {
      const idea = ideaSnap.data();
      const userDoc = await getDoc(doc(db, 'users', idea.userId));
      // Detect if the current banker already submitted a loan proposal for this idea
      let bankerAlreadyProposed = false;
      try {
        if (auth.currentUser && appState.currentUserData && appState.currentUserData.userType === 'banker') {
          const loanPropsSnap = await getDocs(collection(db, `businessIdeas/${ideaSnap.id}/loanProposals`));
          for (const lp of loanPropsSnap.docs) {
            const lpData = lp.data();
            if (lpData && lpData.bankerId === auth.currentUser.uid) { bankerAlreadyProposed = true; break; }
          }
        }
      } catch (e) { console.warn('Failed to check existing loan proposals', e); }
      const userData = userDoc.data();
      const ideaElement = document.createElement('div');
      ideaElement.className = 'bg-white rounded-lg border border-gray-200 p-5 shadow-sm';
      const alreadyInterested = !!(idea.interestedInvestors && auth.currentUser && idea.interestedInvestors.includes(auth.currentUser.uid));
      ideaElement.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-black mb-1">${idea.title}</h3>
            <p class="text-sm text-gray-600 mb-2">${idea.description}</p>
            <p class="text-xs text-gray-400">Posted by ${userData.fullName}</p>
          </div>
          <div class="flex items-center space-x-3">
            <button class="loan-btn p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50" data-idea-id="${ideaSnap.id}" data-already-loan-proposed="${bankerAlreadyProposed ? 'true' : 'false'}" ${bankerAlreadyProposed ? 'disabled' : ''} title="Send loan proposal">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm1 17.93V20h-2v-1.07A7.002 7.002 0 0 1 5.07 13H4v-2h1.07A7.002 7.002 0 0 1 11 5.07V4h2v1.07A7.002 7.002 0 0 1 18.93 11H20v2h-1.07A7.002 7.002 0 0 1 13 18.93zM12 8a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 8z"/></svg>
            </button>
            <button class="handshake-btn p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50" data-idea-id="${ideaSnap.id}" data-already-interested="${alreadyInterested ? 'true' : 'false'}" ${alreadyInterested ? 'disabled' : ''} title="Send proposal">
              <i class="fas fa-handshake text-lg ${alreadyInterested ? 'text-gray-700 opacity-90' : 'text-gray-500 hover:text-black'}"></i>
            </button>
          </div>
        </div>`;
      dom.ideasFeed.appendChild(ideaElement);
    }

    // proposal modal handling
    let pendingIdeaForProposal = null;
    function openProposalModal(ideaId) {
      pendingIdeaForProposal = ideaId;
      document.getElementById('proposalText').value = '';
      document.getElementById('proposalModal').classList.remove('hidden');
    }

    document.querySelectorAll('.handshake-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!auth.currentUser) { showToast('Please sign in to send a proposal', 'info'); return; }
        if (!appState.currentUserData || appState.currentUserData.userType !== 'investor') { showToast('Only investors can send proposals', 'info'); return; }
        if (btn.dataset.alreadyInterested === 'true') { showToast('You have already submitted a proposal for this idea', 'info'); return; }
        openProposalModal(btn.dataset.ideaId);
      });
    });

    // loan modal handling
    let pendingIdeaForLoan = null;
    function openLoanModal(ideaId) {
      pendingIdeaForLoan = ideaId;
      document.getElementById('loanAmount').value = '';
      document.getElementById('loanTerms').value = '';
      document.getElementById('loanModal').classList.remove('hidden');
    }

    document.querySelectorAll('.loan-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!auth.currentUser) { showToast('Please sign in to send a loan proposal', 'info'); return; }
        if (!appState.currentUserData || appState.currentUserData.userType !== 'banker') { showToast('Only bankers can send loan proposals', 'info'); return; }
        if (btn.dataset.alreadyLoanProposed === 'true' || btn.dataset.alreadyLoanProposed === 'true') { showToast('You have already sent a loan proposal for this idea', 'info'); return; }
        try { await logClientAction('banker_open_loan_modal', { bankerId: auth.currentUser.uid, ideaId: btn.dataset.ideaId }); } catch { }
        openLoanModal(btn.dataset.ideaId);
      });
    });

    document.getElementById('loanCancel').addEventListener('click', async () => {
      try { await logClientAction('banker_cancel_loan_modal', { bankerId: auth.currentUser.uid, ideaId: pendingIdeaForLoan }); } catch { }
      document.getElementById('loanModal').classList.add('hidden');
      pendingIdeaForLoan = null;
    });

    document.getElementById('loanSubmit').addEventListener('click', async () => {
      const amount = parseFloat(document.getElementById('loanAmount').value);
      const terms = document.getElementById('loanTerms').value.trim();
      if (!pendingIdeaForLoan) return document.getElementById('loanModal').classList.add('hidden');
      try {
        // Double-check existing loan proposals to avoid duplicates
        try {
          const loanPropsSnap = await getDocs(collection(db, `businessIdeas/${pendingIdeaForLoan}/loanProposals`));
          for (const lp of loanPropsSnap.docs) {
            const lpData = lp.data();
            if (lpData && lpData.bankerId === auth.currentUser.uid) {
              showToast('You have already sent a loan proposal for this idea', 'info');
              document.getElementById('loanModal').classList.add('hidden');
              pendingIdeaForLoan = null;
              return;
            }
          }
        } catch (chkErr) { console.warn('Failed to validate existing loan proposals', chkErr); }

        const res = await sendLoanProposal(auth.currentUser.uid, pendingIdeaForLoan, amount, terms || null);
        try { await logClientAction('banker_submit_loan_proposal', { bankerId: auth.currentUser.uid, ideaId: pendingIdeaForLoan, loanId: res.loanId, notificationId: res.notificationId }); } catch { }
        // Immediately disable the loan button to prevent duplicate sends before snapshot updates
        try {
          const btn = document.querySelector(`.loan-btn[data-idea-id="${pendingIdeaForLoan}"]`);
          if (btn) {
            btn.dataset.alreadyLoanProposed = 'true';
            btn.disabled = true;
            const svg = btn.querySelector('svg');
            if (svg) {
              svg.classList.add('opacity-70', 'cursor-not-allowed');
            }
          }
        } catch (uiErr) { console.warn('Failed to update loan button UI', uiErr); }

        document.getElementById('loanModal').classList.add('hidden');
        pendingIdeaForLoan = null;
        showToast('Loan proposal sent', 'success');
      } catch (err) { showToast('Error sending loan proposal: ' + err.message, 'error'); }
    });

    document.getElementById('proposalCancel').addEventListener('click', () => {
      document.getElementById('proposalModal').classList.add('hidden');
      pendingIdeaForProposal = null;
    });

    document.getElementById('proposalSubmit').addEventListener('click', async () => {
      const text = document.getElementById('proposalText').value.trim();
      if (!pendingIdeaForProposal) {
        document.getElementById('proposalModal').classList.add('hidden');
        return;
      }
      try {
        // Double-check the idea to avoid duplicate proposals in-case of race conditions
        try {
          const ideaRef = doc(db, 'businessIdeas', pendingIdeaForProposal);
          const ideaSnap = await getDoc(ideaRef);
          const ideaData = ideaSnap.exists() ? ideaSnap.data() : null;
          if (ideaData && ideaData.interestedInvestors && ideaData.interestedInvestors.includes(auth.currentUser.uid)) {
            showToast('You have already submitted a proposal for this idea', 'info');
            document.getElementById('proposalModal').classList.add('hidden');
            pendingIdeaForProposal = null;
            return;
          }
        } catch (chkErr) {
          console.warn('Failed to validate existing proposal state', chkErr);
        }

        await showInterest(auth.currentUser.uid, pendingIdeaForProposal, text || null);
        // Immediately disable the handshake button in the UI to prevent duplicate submissions
        try {
          const btn = document.querySelector(`.handshake-btn[data-idea-id="${pendingIdeaForProposal}"]`);
          if (btn) {
            btn.dataset.alreadyInterested = 'true';
            btn.disabled = true;
            const icon = btn.querySelector('i.fas.fa-handshake');
            if (icon) {
              icon.classList.remove('text-gray-400');
              icon.classList.add('text-gray-700');
              icon.classList.remove('hover:text-black');
              icon.classList.add('cursor-not-allowed', 'opacity-70');
            }
          }
        } catch (uiErr) { console.warn('Failed to update handshake button UI', uiErr); }

        document.getElementById('proposalModal').classList.add('hidden');
        pendingIdeaForProposal = null;
        showToast('Proposal sent', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });
  });
}
