// Authentication Module - Expense OS Web
// Handles Google Sign-In, Email/Password Auth, and Auth State Management

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
    let googleProvider = null;

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

    const btnContinueGuest = document.getElementById('btn-continue-guest');
    if (btnContinueGuest) {
      btnContinueGuest.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.setItem('expense_cal_guest_mode', 'true');
        showApp(null);
      });
    }

    let isAuthInProgress = false;

    // Expose auth functions to global scope immediately (function declarations are hoisted)
    window.signInWithGoogle = signInWithGoogle;
    window.signInWithEmail = signInWithEmail;
    window.signUpWithEmail = signUpWithEmail;
    window.showApp = showApp;
    window.showLoginScreen = showLoginScreen;


    async function signInWithGoogle() {
      if (isAuthInProgress) return;
      isAuthInProgress = true;
      let supaErrorMessage = '';
      try {
        clearErrors();
        sessionStorage.removeItem('expense_cal_guest_mode');
        localStorage.removeItem('expense_cal_guest_mode');

        // 1. Prefer Supabase if configured
        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
          try {
            let redirectUrl = window.location.origin + window.location.pathname;
            if (redirectUrl.includes(':3000')) {
              redirectUrl = redirectUrl.replace(':3000', ':58420');
            }
            const { data, error } = await supaClient.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: redirectUrl,
                skipBrowserRedirect: true,
                queryParams: {
                  prompt: 'select_account'
                }
              }
            });
            if (error) throw error;
            if (data && data.url) {
              window.location.href = data.url;
              return;
            }
          } catch (supaErr) {
            console.warn('Supabase Google OAuth notice:', supaErr);
            const msg = supaErr ? (supaErr.message || String(supaErr)) : '';
            showError(loginError, `Supabase Google Auth Notice: ${msg || 'Google Provider is not enabled in Supabase Dashboard.'} Please use Email & Password or click Continue Offline (Guest Mode).`);
            return;
          }
        }

        // 2. Fallback to Firebase Auth
        if (typeof firebase !== 'undefined' && firebase.auth && auth) {
          if (auth.setPersistence) {
            try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch(e) {}
          }
          if (!googleProvider) {
            googleProvider = new firebase.auth.GoogleAuthProvider();
          }
          if (googleProvider) {
            googleProvider.setCustomParameters({ prompt: 'select_account' });
            await auth.signInWithPopup(googleProvider);
            return;
          }
        }

        // If both failed or unavailable, show detailed error message
        const finalMsg = supaErrorMessage 
          ? `Supabase Auth Error: ${supaErrorMessage}. (You can also continue in Guest Mode or Email Sign-In).`
          : 'Google Sign-In is unavailable. Please check your internet connection, sign in with Email & Password, or continue in Guest Mode.';
        showError(loginError, finalMsg);
      } catch (error) {
        console.error('Google Sign-In error:', error);
        const code = error ? (error.code || '') : '';
        const msg = error ? (error.message || '') : '';

        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized domain')) {
          showError(loginError, 'Domain Unauthorized: Please add http://localhost:58420 to Firebase Console -> Authentication -> Settings -> Authorized Domains.');
        } else if (code === 'auth/missing-initial-state' || msg.includes('missing initial state')) {
          showError(loginError, 'Cookie Blocked: Third-party auth cookie was restricted. Please use Email Sign-In or Guest Mode.');
        } else if (code === 'auth/internal-error') {
          showError(loginError, 'Google Login Notice: Third-party auth cookies are restricted in desktop app mode. Please sign in with Email & Password or click Continue Offline (Guest Mode).');
        } else if (code === 'auth/network-request-failed') {
          showError(loginError, 'Network Error: Please check your internet connection or use Guest Mode.');
        } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          showError(loginError, getAuthErrorMessage(error) || msg);
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
            if (data.session) {
              hideLoader();
              showApp(data.user);
            } else {
              showError(signupError, '🎉 Account created successfully! If email confirmation is enabled in your Supabase project, please confirm your email to sign in, or click Continue Offline (Guest Mode).');
            }
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
        }
      } catch (error) {
        console.error('Email Sign-Up error:', error);
        showError(signupError, getAuthErrorMessage(error));
      }
    }

    async function handleSignOut(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }

      try {
        sessionStorage.removeItem('expense_cal_guest_mode');
        sessionStorage.clear();
        localStorage.removeItem('expense_cal_redirect_pending');

        if (typeof stopFirestoreSync === 'function') stopFirestoreSync();
        if (typeof stopSupabaseSync === 'function') stopSupabaseSync();

        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
          try { await supaClient.auth.signOut(); } catch(err) {}
        }
        if (auth) {
          try { await auth.signOut(); } catch(err) {}
        }
      } catch (error) {
        console.error('Sign out error:', error);
      } finally {
        showLoginScreen();
        window.location.href = window.location.origin + window.location.pathname;
      }
    }

    function hideLoader() {
      const loader = document.getElementById('app-loader');
      if (loader) {
        loader.classList.add('hidden');
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.pointerEvents = 'none';
        loader.style.setProperty('display', 'none', 'important');
        setTimeout(() => { 
          if (loader && loader.parentNode) {
            loader.parentNode.removeChild(loader);
          }
        }, 300);
      }
    }

    function getLoginScreen() {
      return document.getElementById('login-screen');
    }
    function getAppLayout() {
      return document.querySelector('.app-layout');
    }

    function showLoginScreen() {
      const ls = getLoginScreen();
      const al = getAppLayout();
      const loginCard = document.getElementById('login-card');
      const signupCard = document.getElementById('signup-card');
      if (ls) {
        ls.classList.remove('hidden');
        ls.style.setProperty('display', 'flex', 'important');
        ls.style.setProperty('flex-direction', 'column', 'important');
        ls.style.setProperty('justify-content', 'center', 'important');
        ls.style.setProperty('align-items', 'center', 'important');
        ls.style.setProperty('position', 'fixed', 'important');
        ls.style.setProperty('top', '0', 'important');
        ls.style.setProperty('left', '0', 'important');
        ls.style.setProperty('width', '100vw', 'important');
        ls.style.setProperty('height', '100vh', 'important');
        ls.style.setProperty('background', '#050811', 'important');
        ls.style.setProperty('z-index', '99999', 'important');
        ls.style.opacity = '1';
        ls.style.visibility = 'visible';
      }
      if (loginCard) {
        loginCard.classList.remove('hidden');
        loginCard.style.setProperty('display', 'block', 'important');
        loginCard.style.opacity = '1';
        loginCard.style.visibility = 'visible';
      }
      if (signupCard) {
        signupCard.classList.add('hidden');
        signupCard.style.setProperty('display', 'none', 'important');
      }
      if (al) {
        al.classList.add('hidden');
        al.style.setProperty('display', 'none', 'important');
      }
    }

    // Safety timeouts and load listener to prevent infinite loader hanging
    setTimeout(hideLoader, 300);
    window.addEventListener('load', hideLoader);

    // 1. OAuth Popup Callback Auto-Closer
    if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code'))) {
      try {
        if (window.opener.location) {
          window.opener.location.reload();
        }
      } catch(e) {}
      window.close();
    }

    // 2. Unified Auth Observer Handler
    async function evaluateAuthState() {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token')) {
        sessionStorage.removeItem('expense_cal_guest_mode');
        localStorage.removeItem('expense_cal_guest_mode');
      }

      // Check Supabase Session
      const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
      if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
        try {
          const { data: { session } } = await supaClient.auth.getSession();
          if (session && session.user) {
            sessionStorage.removeItem('expense_cal_guest_mode');
            hideLoader();
            showApp(session.user);
            return true;
          }
        } catch(e) {}
      }

      // Check Firebase Session
      if (auth && auth.currentUser) {
        sessionStorage.removeItem('expense_cal_guest_mode');
        hideLoader();
        showApp(auth.currentUser);
        return true;
      }

      // If URL has OAuth tokens, wait for Supabase onAuthStateChange to finish parsing
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token')) {
        return false;
      }

      // Check Guest Mode
      const guestMode = sessionStorage.getItem('expense_cal_guest_mode');
      if (guestMode === 'true') {
        hideLoader();
        showApp(null);
        return true;
      }

      // Default to Login Screen if no active session
      hideLoader();
      showLoginScreen();
      return false;
    }

    // Run Auth Evaluation on Startup
    evaluateAuthState();

    // Supabase Auth Listener
    const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
    if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
      supaClient.auth.onAuthStateChange((event, session) => {
        hideLoader();
        if (session && session.user) {
          showApp(session.user);
        } else if (event === 'SIGNED_OUT') {
          showLoginScreen();
        }
      });
    }

    // Firebase Auth Listener
    if (auth) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          hideLoader();
          showApp(user);
        } else {
          // Only show login screen if Supabase is also not logged in
          evaluateAuthState();
        }
      });
    }

    // Ultimate Safety Fallback: guarantee screen is NEVER blank
    setTimeout(() => {
      hideLoader();
      const ls = getLoginScreen();
      const al = getAppLayout();
      if (al && al.classList.contains('hidden') && (!ls || ls.classList.contains('hidden'))) {
        showLoginScreen();
      }
    }, 500);


    async function showApp(user) {
      const ls = getLoginScreen();
      const al = getAppLayout();
      if (ls) {
        ls.classList.add('hidden');
        ls.style.display = 'none';
      }
      if (al) {
        al.classList.remove('hidden');
        al.style.display = 'flex';
      }

      // 1. Synchronously render user details in Profile UI
      const userId = user ? (user.id || user.uid) : null;
      const userEmail = user ? (user.email || (user.user_metadata && user.user_metadata.email) || '') : '';
      const userMeta = user ? (user.user_metadata || {}) : {};
      const rawName = user ? (user.displayName || userMeta.full_name || userMeta.name || (userEmail ? userEmail.split('@')[0] : 'User')) : 'Guest User';
      const userAvatar = user ? (user.photoURL || userMeta.avatar_url || userMeta.picture || null) : null;

      let gender = userId ? localStorage.getItem('expense_cal_user_gender_' + userId) : null;
      let prefix = '';
      let genderText = user ? 'Cloud Account' : 'Guest Mode';
      if (gender === 'male') { prefix = 'Mr. '; }
      else if (gender === 'female') { prefix = 'Ms. '; }

      const fullName = user ? `${prefix}${rawName}` : 'Guest User';
      const initial = user ? (rawName.charAt(0).toUpperCase() || 'U') : 'G';

      // Update Topbar Profile Avatar & Dropdown
      const topbarImg = document.getElementById('topbar-user-img');
      const topbarInitial = document.getElementById('topbar-user-initial');
      const dropInitial = document.getElementById('dropdown-user-initial');
      const dropName = document.getElementById('dropdown-user-name');
      const dropEmail = document.getElementById('dropdown-user-email');
      const dropBadge = document.getElementById('dropdown-user-badge');

      if (userAvatar && topbarImg) {
        topbarImg.src = userAvatar;
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
      if (dropEmail) dropEmail.textContent = userEmail || 'Offline / Local Mode';
      if (dropBadge) dropBadge.textContent = genderText;

      // Update Auth Button in Dropdown (Sign Out vs Sign In / Sync)
      const authIcon = document.getElementById('dropdown-auth-icon');
      const authText = document.getElementById('dropdown-auth-text');
      if (authIcon && authText) {
        if (user) {
          authIcon.className = 'fa-solid fa-right-from-bracket text-danger';
          authText.textContent = 'Sign Out';
        } else {
          authIcon.className = 'fa-solid fa-right-to-bracket text-emerald';
          authText.textContent = 'Sign In / Sync Account';
        }
      }

      // 2. Trigger data loading & real-time sync for the logged-in user
      if (userId) {
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supabase && typeof startSupabaseSync === 'function') {
          startSupabaseSync(userId);
        } else if (typeof startFirestoreSync === 'function') {
          startFirestoreSync(userId);
        } else if (typeof loadStateFromLocal === 'function') {
          loadStateFromLocal();
        }
      } else if (typeof loadStateFromLocal === 'function') {
        loadStateFromLocal();
      }

      // 3. Non-blocking optional gender fetch for Firebase accounts
      if (!gender && user && typeof db !== 'undefined' && db && auth && auth.currentUser && userId) {
        try {
          const doc = await db.collection('users').doc(userId).get();
          if (doc.exists && doc.data() && doc.data().profile) {
            gender = doc.data().profile.gender;
            if (gender) {
              localStorage.setItem('expense_cal_user_gender_' + userId, gender);
              if (dropName) dropName.textContent = `${gender === 'male' ? 'Mr. ' : (gender === 'female' ? 'Ms. ' : '')}${rawName}`;
            }
          }
        } catch (e) {}
      }

      const viewSubtitle = document.getElementById('view-subtitle');
      if (viewSubtitle) {
        viewSubtitle.textContent = user
          ? `Welcome back, ${fullName}! Real-time financial analytics & budget control`
          : `Real-time financial analytics & budget control (Local Mode)`;
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

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-dropdown-menu');
      const profileBtn = document.getElementById('btn-topbar-profile');
      if (dropdown && !dropdown.classList.contains('hidden') && dropdown.style.display !== 'none') {
        if (profileBtn && profileBtn.contains(e.target)) return;
        if (!dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
          dropdown.style.setProperty('display', 'none', 'important');
        }
      }
    });

    // Dropdown Item Event Listeners (Sign Out or Sign In)
    const btnDropdownAuth = document.getElementById('btn-dropdown-auth') || document.getElementById('btn-dropdown-logout');
    if (btnDropdownAuth) {
      btnDropdownAuth.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) {
          dropdown.classList.add('hidden');
          dropdown.style.setProperty('display', 'none', 'important');
        }
        
        sessionStorage.removeItem('expense_cal_guest_mode');
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
