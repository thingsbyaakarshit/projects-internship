import { auth, db } from './firebase-config.js';
import { signUp, signIn } from './firebase-functions.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { appState } from './state.js';
import { dom } from './dom.js';
import { setupIdeasFeed } from './ideas-feed.js';
import { setupNotifications } from './notifications.js';

function toggleAuthMode() {
  appState.isSignUp = !appState.isSignUp;
  dom.signupFields.classList.toggle('hidden');
  dom.authButton.textContent = appState.isSignUp ? 'Sign Up' : 'Sign In';
  dom.toggleAuth.textContent = appState.isSignUp ? 'Already have an account?' : 'Need to create an account?';
}

export function initAuthUI() {
  dom.toggleAuth.addEventListener('click', (e) => { e.preventDefault(); toggleAuthMode(); });

  dom.authButton.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      if (appState.isSignUp) {
        const fullName = document.getElementById('fullName').value;
        const userType = document.getElementById('userType').value;
        localStorage.setItem('pendingUserType', userType);
        await signUp(email, password, userType, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (e) { showToast(e.message, 'error'); }
  });

  dom.signOutBtn.addEventListener('click', () => signOut(auth));

  document.getElementById('saveProfile').addEventListener('click', async () => {
    const fullName = document.getElementById('profileFullName').value;
    const userType = document.getElementById('profileUserType').value;
    try {
      await import('./firebase-functions.js').then(mod => mod.ensureUserDoc(auth.currentUser.uid, { fullName, userType }));
      document.getElementById('completeProfile').classList.add('hidden');
      if (userType === 'entrepreneur') dom.postIdeaForm.classList.remove('hidden');
    } catch (err) { showToast('Error saving profile: ' + err.message, 'error'); }
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = userDoc.data();
        if (!userData || !userData.userType) {
          const pending = localStorage.getItem('pendingUserType');
          if (pending) {
            await import('./firebase-functions.js').then(mod => mod.ensureUserDoc(user.uid, { userType: pending }));
            userData = { ...(userData || {}), userType: pending };
            localStorage.removeItem('pendingUserType');
          }
        }
        if (!userData || !userData.userType || !userData.fullName) {
          document.getElementById('completeProfile').classList.remove('hidden');
          if (userData?.fullName) document.getElementById('profileFullName').value = userData.fullName;
          if (userData?.userType) document.getElementById('profileUserType').value = userData.userType;
        } else {
          document.getElementById('completeProfile').classList.add('hidden');
        }
        dom.authSection.classList.add('hidden');
        dom.dashboard.classList.remove('hidden');
        document.getElementById('userEmail').textContent = user.email;
        appState.currentUserData = userData || null;
        if (userData?.userType === 'entrepreneur') {
          dom.postIdeaForm.classList.remove('hidden');
        } else {
          // Ensure the form is hidden for non-entrepreneurs
          dom.postIdeaForm.classList.add('hidden');
        }
        setupIdeasFeed(appState);
        setupNotifications(user.uid, appState);
      } catch (e) {
        console.error(e); showToast('Error loading user data: ' + e.message, 'error');
      }
    } else {
      dom.authSection.classList.remove('hidden');
      dom.dashboard.classList.add('hidden');
      appState.currentUserData = null;
      // hide post idea form when signed out
      dom.postIdeaForm.classList.add('hidden');
    }
  });
}
