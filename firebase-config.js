// Firebase Configuration - Expense OS
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
const isFirebaseConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_');

if (isFirebaseConfigured) {
  firebase.initializeApp(firebaseConfig);

  // Enable Firestore offline persistence
  firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Firestore persistence: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.log('Firestore persistence: not supported.');
    }
  });
}

// Expose globals (null if not configured — app falls back to localStorage)
const auth = isFirebaseConfigured ? firebase.auth() : null;
const db = isFirebaseConfigured ? firebase.firestore() : null;
