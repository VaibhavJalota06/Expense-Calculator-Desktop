// Firebase Configuration - Expense OS Web
// ============================================================
// SETUP: Replace placeholder values with your Firebase project credentials.
// Get these from: https://console.firebase.google.com
//   → Your Project → Project Settings (gear icon) → General → Your apps → Web app
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCv5wR1VCfiedYOH0aeO1r47CPUEgmkol4",
  authDomain: "expense-os.firebaseapp.com",
  projectId: "expense-os",
  storageBucket: "expense-os.firebasestorage.app",
  messagingSenderId: "923139726274",
  appId: "1:923139726274:web:d5188f177600a2716e945b",
  measurementId: "G-7XJJ0XN5GS"
};


// Check if Firebase is properly configured
const isFirebaseConfigured = typeof firebase !== 'undefined' && Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_'));

let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    try {
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (e) {
      console.warn('Auth persistence set error:', e);
    }

    // Enable Firestore offline persistence
    firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.log('Firestore persistence: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        console.log('Firestore persistence: not supported.');
      }
    });

    auth = firebase.auth();
    db = firebase.firestore();
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

// EmailJS Configuration for Live Gmail Delivery
const emailjsConfig = {
  serviceId: "service_lvqngas",
  templateId: "template_fk8vygf",
  publicKey: "G-SqtFUz45wJEjLEs"
};

if (typeof emailjs !== 'undefined' && emailjsConfig.publicKey) {
  try { emailjs.init(emailjsConfig.publicKey); } catch (e) {}
}
