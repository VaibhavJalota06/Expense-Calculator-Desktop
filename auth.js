// Authentication Module - Expense OS Web
// Handles Google Sign-In, Email/Password Auth, and Auth State Management

if (isFirebaseConfigured && auth) {
  (function initAuth() {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.app-layout');
    const loginCard = document.getElementById('login-card');
    const signupCard = document.getElementById('signup-card');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmInput = document.getElementById('signup-confirm-password');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const btnShowSignup = document.getElementById('btn-show-signup');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnLogout = document.getElementById('btn-logout');
    const userAvatarEl = document.getElementById('user-avatar');
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email-display');
    const syncStatusEl = document.getElementById('sync-status');
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // Toggle Login / Signup
    if (btnShowSignup) {
      btnShowSignup.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginCard) loginCard.classList.add('hidden');
        if (signupCard) signupCard.classList.remove('hidden');
        clearErrors();
      });
    }
    if (btnShowLogin) {
      btnShowLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (signupCard) signupCard.classList.add('hidden');
        if (loginCard) loginCard.classList.remove('hidden');
        clearErrors();
      });
    }

    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Auth Actions
    async function signInWithGoogle() {
      try {
        clearErrors();
        if (isMobileBrowser) {
          await auth.signInWithRedirect(googleProvider);
        } else {
          try {
            await auth.signInWithPopup(googleProvider);
          } catch (popupErr) {
            if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
              await auth.signInWithRedirect(googleProvider);
            } else {
              showError(loginError, getAuthErrorMessage(popupErr));
            }
          }
        }
      } catch (error) {
        console.error('Google Sign-In error:', error);
        showError(loginError, getAuthErrorMessage(error));
      }
    }

    async function signInWithEmail(email, password) {
      try {
        clearErrors();
        await auth.signInWithEmailAndPassword(email, password);
      } catch (error) {
        console.error('Email Sign-In error:', error);
        showError(loginError, getAuthErrorMessage(error));
      }
    }

    async function signUpWithEmail(email, password) {
      try {
        clearErrors();
        await auth.createUserWithEmailAndPassword(email, password);
      } catch (error) {
        console.error('Email Sign-Up error:', error);
        showError(signupError, getAuthErrorMessage(error));
      }
    }

    async function handleSignOut() {
      try {
        stopFirestoreSync();
        await auth.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }

    let isRedirectPending = true;

    // Handle Mobile OAuth Redirect Result
    auth.getRedirectResult().then((result) => {
      isRedirectPending = false;
      if (result && result.user) {
        hideLoader();
        showApp(result.user);
        startFirestoreSync(result.user.uid);
      }
    }).catch((error) => {
      isRedirectPending = false;
      if (error && error.code) {
        console.error('Redirect result error:', error);
        showError(loginError, getAuthErrorMessage(error));
        showError(signupError, getAuthErrorMessage(error));
      }
    });

    function hideLoader() {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
      }
    }

    // Safety timeout to prevent infinite loader hanging on mobile networks
    setTimeout(hideLoader, 3500);

    // Auth State Observer
    auth.onAuthStateChanged((user) => {
      if (user) {
        isRedirectPending = false;
        hideLoader();
        showApp(user);
        startFirestoreSync(user.uid);
      } else {
        // Wait briefly for redirect result on mobile before dropping back to login screen
        setTimeout(() => {
          if (!auth.currentUser && !isRedirectPending) {
            hideLoader();
            showLoginScreen();
            stopFirestoreSync();
          }
        }, 800);
      }
    });

    function showApp(user) {
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appLayout) appLayout.classList.remove('hidden');
      if (userAvatarEl) {
        if (user.photoURL) {
          userAvatarEl.src = user.photoURL;
          userAvatarEl.style.display = 'block';
        } else {
          userAvatarEl.style.display = 'none';
        }
      }
      if (userNameEl) userNameEl.textContent = user.displayName || 'User';
      if (userEmailEl) userEmailEl.textContent = user.email || '';
    }

    function showLoginScreen() {
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (appLayout) appLayout.classList.add('hidden');
      budget = 0;
      expenses = [];
      subscriptions = [];
      selectedMonth = getCurrentYearMonth();
      updateMonthPickerOptions();
      updateUI();
    }

    // Error Helpers
    function showError(el, msg) {
      if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    }
    function clearErrors() {
      if (loginError) loginError.classList.add('hidden');
      if (signupError) signupError.classList.add('hidden');
    }
    function getAuthErrorMessage(err) {
      const code = typeof err === 'string' ? err : (err && err.code ? err.code : '');
      const message = err && err.message ? err.message : '';
      const m = {
        'auth/invalid-email': 'Invalid email address format.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email. Please click "Create one" below to sign up.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password. Please check your credentials or click "Create one" below to sign up.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase console.',
        'auth/unauthorized-domain': 'This domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.',
      };
      return m[code] || (message ? message : 'Authentication error. Please try again.');
    }

    // Sync Status Badge
    window.setSyncStatus = function(status) {
      if (!syncStatusEl) return;
      const states = {
        syncing: { text: 'Syncing...', cls: 'sync-syncing', icon: 'fa-arrows-rotate fa-spin' },
        synced: { text: 'Synced', cls: 'sync-synced', icon: 'fa-circle-check' },
        offline: { text: 'Offline', cls: 'sync-offline', icon: 'fa-wifi' },
        error: { text: 'Sync Error', cls: 'sync-error', icon: 'fa-triangle-exclamation' },
      };
      const s = states[status] || states.synced;
      syncStatusEl.className = `sync-status-badge ${s.cls}`;
      syncStatusEl.innerHTML = `<i class="fa-solid ${s.icon}"></i> ${s.text}`;
    };

    // Event Listeners
    document.querySelectorAll('.btn-google-login').forEach(btn => {
      btn.addEventListener('click', signInWithGoogle);
    });

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmailInput ? loginEmailInput.value.trim() : '';
        const password = loginPasswordInput ? loginPasswordInput.value : '';
        if (!email || !password) { showError(loginError, 'Please fill in all fields.'); return; }
        signInWithEmail(email, password);
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signupEmailInput ? signupEmailInput.value.trim() : '';
        const password = signupPasswordInput ? signupPasswordInput.value : '';
        const confirm = signupConfirmInput ? signupConfirmInput.value : '';
        if (!email || !password || !confirm) { showError(signupError, 'Please fill in all fields.'); return; }
        if (password !== confirm) { showError(signupError, 'Passwords do not match.'); return; }
        if (password.length < 6) { showError(signupError, 'Password must be at least 6 characters.'); return; }
        signUpWithEmail(email, password);
      });
    }

    if (btnLogout) btnLogout.addEventListener('click', handleSignOut);
  })();
} else {
  // Firebase not configured — run in offline/localStorage mode
  (function offlineMode() {
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.app-layout');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appLayout) appLayout.classList.remove('hidden');
    const userProfile = document.getElementById('user-profile');
    if (userProfile) userProfile.style.display = 'none';
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) syncStatus.style.display = 'none';
    window.setSyncStatus = function() {};
  })();
}
