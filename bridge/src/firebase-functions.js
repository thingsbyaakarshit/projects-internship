import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc, addDoc, collection, arrayUnion, getDoc, updateDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { collection as collectionRef } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Ensure user document exists/updated
export async function ensureUserDoc(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
    await logAction('ensure_user_doc', { userId: uid, data });
  } catch (error) {
    console.error('Error ensuring user doc:', error);
    throw error;
  }
}

// Authentication functions
export async function signUp(email, password, userType, fullName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      userType,
      fullName,
      createdAt: new Date().toISOString()
    });

    console.log('Created user document for', user.uid, { email, userType, fullName });

    // Log the action
    await logAction('user_signup', { userId: user.uid, userType });

    return user;
  } catch (error) {
    throw error;
  }
}

export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await logAction('user_login', { userId: userCredential.user.uid });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

// Business idea functions
export async function postBusinessIdea(userId, title, description, forReview = false) {
  try {
    const ideaRef = await addDoc(collection(db, "businessIdeas"), {
      userId,
      title,
      description,
      createdAt: new Date().toISOString(),
      interestedInvestors: []
    });

    await logAction('post_idea', { userId, ideaId: ideaRef.id });
    console.log('Posted business idea', ideaRef.id, 'by', userId);
    // If marked for review, notify all advisors
    if (forReview) {
      try {
        // simple query for advisors
        const advisorsQuery = await getDocs(query(collection(db, 'users'), where('userType', '==', 'advisor')));
        for (const aDoc of advisorsQuery.docs) {
          const aId = aDoc.id;
          await addDoc(collection(db, 'notifications'), {
            type: 'idea_for_review',
            ideaId: ideaRef.id,
            recipientId: aId,
            createdAt: new Date().toISOString(),
            read: false,
            ideaTitle: title,
            message: 'Idea for review'
          });
        }
        await logAction('notify_advisors_for_review', { userId, ideaId: ideaRef.id, advisorsNotifiedCount: advisorsQuery.docs.length });
      } catch (e) {
        console.warn('Failed to notify advisors for review', e);
      }
    }

    return ideaRef.id;
  } catch (error) {
    throw error;
  }
}

export async function showInterest(investorId, ideaId, proposalText = null) {
  try {
    // Get the business idea to find the entrepreneur's ID
    const ideaRef = doc(db, "businessIdeas", ideaId);
    const ideaDoc = await getDoc(ideaRef);

    if (!ideaDoc.exists()) {
      throw new Error('Business idea not found');
    }

    const ideaData = ideaDoc.data();

    // Add to interested investors
    await setDoc(ideaRef, {
      interestedInvestors: arrayUnion(investorId)
    }, { merge: true });
    // Create notification for the entrepreneur
    const recipientId = ideaData.userId;
    console.log('Creating notification for recipient:', recipientId, 'investor:', investorId);

    // Store proposal in a subcollection under the idea for stronger data model
    if (proposalText) {
      try {
        await addDoc(collection(db, `businessIdeas/${ideaId}/proposals`), {
          investorId,
          proposalText,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Failed to store proposal in subcollection', e);
      }
    }

    const notifRef = await addDoc(collection(db, "notifications"), {
      type: "interest_shown",
      investorId,
      ideaId,
      recipientId: recipientId, // Send notification to the entrepreneur
      createdAt: new Date().toISOString(),
      read: false,
      ideaTitle: ideaData.title, // Include idea title for better context
      proposalText: proposalText
    });

    console.log('Notification created:', notifRef.id);
    await logAction('show_interest', { investorId, ideaId, recipientId: ideaData.userId, notificationId: notifRef.id });
  } catch (error) {
    console.error('Error in showInterest:', error);
    throw error;
  }
}// Logging function
async function logAction(action, details) {
  try {
    await addDoc(collection(db, "logs"), {
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
}

// Expose a client-callable logging function
export async function logClientAction(action, details) {
  try {
    // Enrich details with recipient information when possible
    const enhanced = { ...(details || {}) };

    try {
      // If an ideaId is provided, fetch the idea owner (recipient)
      if (enhanced.ideaId) {
        const ideaRef = doc(db, "businessIdeas", enhanced.ideaId);
        const ideaDoc = await getDoc(ideaRef);
        if (ideaDoc.exists()) {
          const ideaData = ideaDoc.data();
          enhanced.recipientId = ideaData.userId || enhanced.recipientId;
          // try to fetch recipient name
          try {
            const userRef = doc(db, 'users', enhanced.recipientId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) enhanced.recipientName = userDoc.data().fullName || enhanced.recipientName;
          } catch (e) {
            // ignore name lookup failures
          }
        }
      }
    } catch (e) {
      console.warn('Could not enrich log details with recipient info', e);
    }

    // If bankerId or investorId provided, we can leave them as sender info.
    await logAction(action, enhanced);
  } catch (error) {
    console.error('Error in logClientAction:', error);
    throw error;
  }
}

// Banker: send loan proposal to idea owner
export async function sendLoanProposal(bankerId, ideaId, amount, terms) {
  try {
    const ideaRef = doc(db, "businessIdeas", ideaId);
    const ideaDoc = await getDoc(ideaRef);
    if (!ideaDoc.exists()) throw new Error('Idea not found');
    const ideaData = ideaDoc.data();

    // store loan proposal in subcollection
    const loanRef = await addDoc(collection(db, `businessIdeas/${ideaId}/loanProposals`), {
      bankerId,
      amount,
      terms,
      createdAt: new Date().toISOString()
    });

    // create notification to idea owner
    const notifRef = await addDoc(collection(db, "notifications"), {
      type: "loan_proposal",
      bankerId,
      ideaId,
      recipientId: ideaData.userId,
      amount,
      terms,
      createdAt: new Date().toISOString(),
      read: false,
      ideaTitle: ideaData.title
    });

    await logAction('loan_proposal', { bankerId, ideaId, recipientId: ideaData.userId, loanRef: loanRef.id, notificationId: notifRef.id });
    return { loanId: loanRef.id, notificationId: notifRef.id };
  } catch (error) {
    console.error('Error in sendLoanProposal:', error);
    throw error;
  }
}

// Respond to a proposal notification (accept/reject)
export async function respondToProposal(notificationId, responderId, response) {
  // response should be 'accept' or 'reject'
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    const notifDoc = await getDoc(notifRef);
    if (!notifDoc.exists()) throw new Error('Notification not found');
    const notif = notifDoc.data();

    // mark notification as read and store response
    try {
      await updateDoc(notifRef, { read: true, respondedAt: new Date().toISOString(), response });
    } catch (e) {
      // fallback to setDoc merge if updateDoc fails
      await setDoc(notifRef, { read: true, respondedAt: new Date().toISOString(), response }, { merge: true });
    }

    // determine original sender (investor or banker)
    const senderId = notif.investorId || notif.bankerId || notif.senderId || null;

    // create a response notification back to the sender if available
    let responseNotifRef = null;
    if (senderId) {
      responseNotifRef = await addDoc(collection(db, 'notifications'), {
        type: 'proposal_response',
        responderId,
        ideaId: notif.ideaId || null,
        recipientId: senderId,
        accepted: response === 'accept',
        message: response === 'accept' ? 'Proposal was accepted' : 'Proposal was rejected',
        originalNotificationId: notificationId,
        ideaTitle: notif.ideaTitle || null,
        createdAt: new Date().toISOString(),
        read: false
      });
    }

    // Log the action
    await logAction('proposal_response', { responderId, senderId, ideaId: notif.ideaId, notificationId, response, responseNotificationId: responseNotifRef ? responseNotifRef.id : null });

    return { responseNotificationId: responseNotifRef ? responseNotifRef.id : null };
  } catch (error) {
    console.error('Error in respondToProposal:', error);
    throw error;
  }
}

// Advisor submits a review for an idea
export async function sendAdvisorReview(advisorId, ideaId, reviewText) {
  try {
    const ideaRef = doc(db, 'businessIdeas', ideaId);
    const ideaDoc = await getDoc(ideaRef);
    if (!ideaDoc.exists()) throw new Error('Idea not found');
    const idea = ideaDoc.data();

    // create notification to the idea owner
    const notifRef = await addDoc(collection(db, 'notifications'), {
      type: 'advisor_review',
      advisorId,
      ideaId,
      recipientId: idea.userId,
      message: reviewText || null,
      ideaTitle: idea.title || null,
      createdAt: new Date().toISOString(),
      read: false
    });

    await logAction('advisor_review', { advisorId, ideaId, recipientId: idea.userId, notificationId: notifRef.id });
    return { notificationId: notifRef.id };
  } catch (error) {
    console.error('Error in sendAdvisorReview:', error);
    throw error;
  }
}
