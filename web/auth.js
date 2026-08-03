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
    // Topbar profile elements (sidebar profile was removed)
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

    let isAuthInProgress = false;

    // Auth Actions
    async function signInWithGoogle() {
      if (isAuthInProgress) return;
      isAuthInProgress = true;
      try {
        clearErrors();

        // 1. Prefer Supabase if configured
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin + window.location.pathname
            }
          });
          if (error) throw error;
          return;
        }

        // 2. Fallback to Firebase Auth
        if (auth && auth.setPersistence) {
          try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch(e) {}
        }

        googleProvider.setCustomParameters({ prompt: 'select_account' });
        await auth.signInWithPopup(googleProvider);
      } catch (error) {
        console.error('Google Sign-In error:', error);
        const code = error ? (error.code || '') : '';
        const msg = error ? (error.message || '') : '';

        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized domain')) {
          showError(loginError, 'Domain Unauthorized: Please add this domain to Firebase / Supabase Settings > Authorized Domains.');
        } else if (code === 'auth/missing-initial-state' || msg.includes('missing initial state')) {
          showError(loginError, 'Safari Privacy Restriction: Apple Safari blocked Google cross-site login cookies. Please sign in with Email.');
        } else if (code === 'auth/internal-error') {
          showError(loginError, 'Google Authentication Error: Third-party login cookies are restricted by your browser. Please sign in with Email & Password.');
        } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          showError(loginError, getAuthErrorMessage(error));
        }
      } finally {
        isAuthInProgress = false;
      }
    }

    async function signInWithEmail(email, password) {
      try {
        clearErrors();

        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data && data.user) {
            hideLoader();
            showApp(data.user);
          }
          return;
        }

        if (auth) {
          await auth.signInWithEmailAndPassword(email, password);
        }
      } catch (error) {
        console.error('Email Sign-In error:', error);
        showError(loginError, getAuthErrorMessage(error));
      }
    }

    async function triggerWelcomeEmail(user, name) {
      if (!user || !user.email) return;
      const uid = user.uid || user.id || 'user';
      const key = 'expense_cal_welcome_email_sent_' + uid;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, 'true');

      const recipientName = name || user.displayName || (user.user_metadata && user.user_metadata.display_name) || user.email.split('@')[0] || 'User';

      // Automated Live Delivery via EmailJS directly to Gmail
      if (typeof emailjs !== 'undefined' && typeof emailjsConfig !== 'undefined') {
        try {
          if (emailjs.init && emailjsConfig.publicKey) {
            try { emailjs.init(emailjsConfig.publicKey); } catch(e){}
          }
          const WEB_APP_URL = 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/';

          await emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templateId,
            {
              email: user.email,
              to_email: user.email,
              user_email: user.email,
              recipient_email: user.email,
              name: recipientName,
              user_name: recipientName,
              subject: '🎉 Welcome to Expense OS — Your Personal Finance Command Center!',
              message: `Welcome to Expense OS, ${recipientName}! Your personal finance command center is now active. Launch the web app below to track your expenses anytime.`,
              web_app_url: WEB_APP_URL,
              app_url: WEB_APP_URL,
              action_url: WEB_APP_URL,
              url: WEB_APP_URL,
              link: WEB_APP_URL
            },
            emailjsConfig.publicKey
          );
          console.log('Automated Welcome Email sent successfully to:', user.email);
        } catch (err) {
          console.warn('Welcome Email delivery notice:', err);
        }
      }
    }

    async function signUpWithEmail(name, gender, email, password) {
      try {
        clearErrors();

        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: name, gender: gender }
            }
          });
          if (error) throw error;
          if (data && data.user) {
            const uid = data.user.id;
            localStorage.setItem('expense_cal_user_gender_' + uid, gender);
            localStorage.setItem('expense_cal_show_welcome_' + uid, 'true');
            triggerWelcomeEmail(data.user, name);
            hideLoader();
            showApp(data.user);
          }
          return;
        }

        if (auth) {
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          if (cred && cred.user) {
            if (name) {
              try { await cred.user.updateProfile({ displayName: name }); } catch (e) {}
            }
            if (gender) {
              localStorage.setItem('expense_cal_user_gender_' + cred.user.uid, gender);
            }
            localStorage.setItem('expense_cal_show_welcome_' + cred.user.uid, 'true');
          triggerWelcomeEmail(cred.user, name);
          if (db) {
            try {
              await db.collection('users').doc(cred.user.uid).set({
                profile: { name, gender },
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (e) {}
          }
        }
      } catch (error) {
        console.error('Email Sign-Up error:', error);
        showError(signupError, getAuthErrorMessage(error));
      }
    }

    async function handleSignOut(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const ok = typeof showConfirm === 'function'
        ? await showConfirm('Sign Out Confirmation', 'Are you sure you want to sign out of your Expense OS account?', false)
        : window.confirm('Are you sure you want to sign out of your Expense OS account?');
      if (!ok) return;

      try {
        stopFirestoreSync();
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        }
        if (auth) {
          await auth.signOut();
        }
        showLoginScreen();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }

    function hideLoader() {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
      }
    }

    // Safety timeout to prevent infinite loader hanging
    setTimeout(hideLoader, 1500);

    // Supabase Auth Session Observer
    if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        hideLoader();
        if (session && session.user) {
          showApp(session.user);
        } else if (!auth) {
          showLoginScreen();
        }
      });

      supabase.auth.onAuthStateChange((event, session) => {
        hideLoader();
        if (session && session.user) {
          showApp(session.user);
        } else if (!auth || !auth.currentUser) {
          showLoginScreen();
        }
      });
    }

    // Firebase Auth Observer (Fallback Mode)
    if (auth) {
      auth.onAuthStateChanged((user) => {
        hideLoader();
        if (user) {
          localStorage.removeItem('expense_cal_redirect_pending');
          showApp(user);
          startFirestoreSync(user.uid);
        } else if (typeof isSupabaseConfigured === 'undefined' || !isSupabaseConfigured || !supabase) {
          localStorage.removeItem('expense_cal_redirect_pending');
          showLoginScreen();
          stopFirestoreSync();
        }
      });
    }

    async function showApp(user) {
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appLayout) appLayout.classList.remove('hidden');

      const rawName = (user && (user.displayName || user.email)) ? (user.displayName || user.email.split('@')[0]) : 'User';
      let gender = user ? localStorage.getItem('expense_cal_user_gender_' + user.uid) : null;

      if (!gender && user && db) {
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists && doc.data() && doc.data().profile) {
            gender = doc.data().profile.gender;
            if (gender) localStorage.setItem('expense_cal_user_gender_' + user.uid, gender);
          }
        } catch (e) {}
      }

      let prefix = '';
      let genderText = 'User Profile';
      if (gender === 'male') { prefix = 'Mr. '; genderText = 'Male (Mr.)'; }
      else if (gender === 'female') { prefix = 'Ms. '; genderText = 'Female (Ms.)'; }

      const fullName = `${prefix}${rawName}`;
      const initial = rawName.charAt(0).toUpperCase() || 'U';



      // Update Topbar Profile Avatar & Dropdown
      const topbarImg = document.getElementById('topbar-user-img');
      const topbarInitial = document.getElementById('topbar-user-initial');
      const dropInitial = document.getElementById('dropdown-user-initial');
      const dropName = document.getElementById('dropdown-user-name');
      const dropEmail = document.getElementById('dropdown-user-email');
      const dropBadge = document.getElementById('dropdown-user-badge');

      if (user && user.photoURL && topbarImg) {
        topbarImg.src = user.photoURL;
        topbarImg.classList.remove('hidden');
        if (topbarInitial) topbarInitial.classList.add('hidden');
      } else {
        if (topbarImg) topbarImg.classList.add('hidden');
        if (topbarInitial) {
          topbarInitial.textContent = initial;
          topbarInitial.classList.remove('hidden');
        }
      }

      if (dropInitial) dropInitial.textContent = initial;
      if (dropName) dropName.textContent = fullName;
      if (dropEmail) dropEmail.textContent = (user && user.email) || 'Local Account';
      if (dropBadge) dropBadge.textContent = genderText;

      const viewSubtitle = document.getElementById('view-subtitle');
      if (viewSubtitle) {
        viewSubtitle.textContent = `Welcome back, ${fullName}! Real-time financial analytics & budget control`;
      }

      const hasSeenWelcome = (user && localStorage.getItem('expense_cal_seen_welcome_v2_' + user.uid)) || localStorage.getItem('expense_cal_seen_welcome_global');
      if (user && !hasSeenWelcome) {
        localStorage.setItem('expense_cal_seen_welcome_v2_' + user.uid, 'true');
        localStorage.setItem('expense_cal_seen_welcome_global', 'true');
        triggerWelcomeEmail(user, fullName);
        const modal = document.getElementById('welcome-modal');
        const titleEl = document.getElementById('welcome-modal-title');
        const msgEl = document.getElementById('welcome-modal-msg');
        if (modal) {
          if (titleEl) titleEl.textContent = `Welcome Aboard, ${fullName}! 🎉`;
          if (msgEl) msgEl.textContent = `We are thrilled to have you here! Your personal finance command center is ready to help you track expenses, manage budget caps, and organize recurring bills effortlessly.`;
          setTimeout(() => modal.classList.remove('hidden'), 600);
        }
      }
    }

    // Topbar Profile Avatar Dropdown Toggle
    const topbarProfileBtn = document.getElementById('btn-topbar-profile');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    if (topbarProfileBtn && userDropdownMenu) {
      topbarProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        userDropdownMenu.classList.toggle('hidden');
      });
    }

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-dropdown-menu');
      const profileBtn = document.getElementById('btn-topbar-profile');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (profileBtn && profileBtn.contains(e.target)) return;
        if (!dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      }
    });

    // Dropdown Item Event Listeners
    const btnDropdownLogout = document.getElementById('btn-dropdown-logout');
    if (btnDropdownLogout) {
      btnDropdownLogout.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) dropdown.classList.add('hidden');
        handleSignOut(e);
      });
    }

    const btnEditProfile = document.getElementById('btn-dropdown-edit-profile');
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) dropdown.classList.add('hidden');

        const modal = document.getElementById('edit-profile-modal');
        const nameInput = document.getElementById('edit-profile-name');
        const genderSelect = document.getElementById('edit-profile-gender');
        const emailInput = document.getElementById('edit-profile-email');

        const currentUser = auth ? auth.currentUser : null;
        let currentName = currentUser ? (currentUser.displayName || '') : '';
        if (!currentName) {
          const dropName = document.getElementById('dropdown-user-name');
          if (dropName) currentName = dropName.textContent.replace(/^(Mr\.\s*|Ms\.\s*)/i, '').trim();
        }
        const currentUid = currentUser ? currentUser.uid : 'local';
        const currentGender = localStorage.getItem('expense_cal_user_gender_' + currentUid) || 'male';

        if (nameInput) nameInput.value = currentName;
        if (genderSelect) genderSelect.value = currentGender;
        if (emailInput) emailInput.value = (currentUser && currentUser.email) || 'Local Mode';

        if (modal) modal.classList.remove('hidden');
      });
    }

    const btnCheckUpdate = document.getElementById('btn-dropdown-check-update');
    if (btnCheckUpdate) {
      btnCheckUpdate.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) dropdown.classList.add('hidden');
        if (typeof checkAppUpdates === 'function') checkAppUpdates(true);
      });
    }

    ['edit-profile-close', 'edit-profile-cancel'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const modal = document.getElementById('edit-profile-modal');
          if (modal) modal.classList.add('hidden');
        });
      }
    });

    // Edit Profile Form Submit Handler
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
      editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('edit-profile-name');
        const genderSelect = document.getElementById('edit-profile-gender');
        const modal = document.getElementById('edit-profile-modal');

        const newName = nameInput ? nameInput.value.trim() : '';
        const newGender = genderSelect ? genderSelect.value : 'male';
        const currentUser = auth ? auth.currentUser : null;

        if (!newName) return;

        if (currentUser) {
          try {
            await currentUser.updateProfile({ displayName: newName });
          } catch(err) { console.error('Error updating auth profile:', err); }

          localStorage.setItem('expense_cal_user_gender_' + currentUser.uid, newGender);

          if (db) {
            try {
              await db.collection('users').doc(currentUser.uid).set({
                profile: { name: newName, gender: newGender },
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch(err) { console.error('Error updating firestore profile:', err); }
          }

          showApp(currentUser);
        } else {
          showApp({ displayName: newName, email: 'Local Mode' });
        }

        if (modal) modal.classList.add('hidden');
        if (typeof showAlert === 'function') {
          showAlert('Profile Updated!', 'Your profile information has been saved successfully.');
        }
      });
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
        'auth/cancelled-popup-request': 'Sign-in popup request was interrupted. Please try again.',
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
        const nameInput = document.getElementById('signup-name');
        const genderSelect = document.getElementById('signup-gender');
        const name = nameInput ? nameInput.value.trim() : '';
        const gender = genderSelect ? genderSelect.value : 'male';
        const email = signupEmailInput ? signupEmailInput.value.trim() : '';
        const password = signupPasswordInput ? signupPasswordInput.value : '';
        const confirm = signupConfirmInput ? signupConfirmInput.value : '';

        if (!name || !email || !password || !confirm) { showError(signupError, 'Please fill in all fields.'); return; }
        if (password !== confirm) { showError(signupError, 'Passwords do not match.'); return; }
        if (password.length < 6) { showError(signupError, 'Password must be at least 6 characters.'); return; }
        signUpWithEmail(name, gender, email, password);
      });
    }


  })();
} else {
  // Firebase not configured — run in offline/localStorage mode
  (function offlineMode() {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      loader.style.pointerEvents = 'none';
      loader.style.display = 'none';
    }
    const loginScreen = document.getElementById('login-screen');
    const appLayout = document.querySelector('.app-layout');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appLayout) appLayout.classList.remove('hidden');

    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) syncStatus.style.display = 'none';
    window.setSyncStatus = function() {};
  })();
}
