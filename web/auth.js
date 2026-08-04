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
    window.handleSignOut = handleSignOut;
    window.promptSignOut = promptSignOut;
    window.closeSignOutModal = closeSignOutModal;
    window.confirmSignOut = confirmSignOut;
    window.handleAdminLoginClick = handleAdminLoginClick;
    window.handleSignInSubmit = handleSignInSubmit;
    window.handleSignUpSubmit = handleSignUpSubmit;
    window.showWelcomeModal = function() {
      const modal = document.getElementById('welcome-modal');
      if (modal) modal.classList.remove('hidden');
    };


    async function signInWithGoogle() {
      let supaErrorMessage = '';
      try {
        clearErrors();
        sessionStorage.removeItem('expense_cal_guest_mode');
        localStorage.removeItem('expense_cal_guest_mode');

        // 1. Prefer Supabase if configured
        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
          try {
            const redirectUrl = window.location.href.split('#')[0].split('?')[0];

            const { data, error } = await supaClient.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: redirectUrl,
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

        // If Supabase unavailable, show error message
        showError(loginError, 'Google Sign-In is unavailable. Please check your internet connection, sign in with Email & Password, or click Continue Offline (Guest Mode).');
      } catch (error) {
        console.error('Google Sign-In error:', error);
        const msg = error ? (error.message || String(error)) : '';
        showError(loginError, msg || 'Google Sign-In error. Please try again or click Continue Offline (Guest Mode).');
      } finally {
        isAuthInProgress = false;
      }
    }

    function handleSignInSubmit(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(err){} }
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const errEl = document.getElementById('login-error');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';

      if (!email || !password) {
        if (errEl) {
          errEl.textContent = 'Please fill in all fields (Email and Password).';
          errEl.classList.remove('hidden');
        }
        return false;
      }

      signInWithEmail(email, password);
      return false;
    }

    function handleSignUpSubmit(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(err){} }
      const nameInput = document.getElementById('signup-name');
      const genderSelect = document.getElementById('signup-gender');
      const emailInput = document.getElementById('signup-email');
      const passInput = document.getElementById('signup-password');
      const confirmInput = document.getElementById('signup-confirm-password');
      const errEl = document.getElementById('signup-error');

      const name = nameInput ? nameInput.value.trim() : '';
      const gender = genderSelect ? genderSelect.value : 'male';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';
      const confirm = confirmInput ? confirmInput.value : '';

      if (!name || !email || !password || !confirm) {
        if (errEl) { errEl.textContent = 'Please fill in all fields.'; errEl.classList.remove('hidden'); }
        return false;
      }
      if (password !== confirm) {
        if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); }
        return false;
      }
      if (password.length < 6) {
        if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); }
        return false;
      }

      signUpWithEmail(name, gender, email, password);
      return false;
    }

    function handleAdminLoginClick(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(err){} }
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput) emailInput.value = 'admin@expenseos.com';
      if (passInput) passInput.value = 'Admin@2026';
      signInWithEmail('admin@expenseos.com', 'Admin@2026');
    }

    async function signInWithEmail(email, password) {
      try {
        clearErrors();
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const cleanPass = password ? password.trim() : '';
        if (!cleanEmail || !cleanPass) {
          showError(loginError, 'Please enter a valid email and password.');
          return;
        }

        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));

        // 1. Admin Account Check
        if (cleanEmail === 'admin@expenseos.com' && (cleanPass === 'Admin@2026' || cleanPass.toLowerCase() === 'admin@2026')) {
          const adminUser = {
            id: 'admin_sys_2026',
            email: 'admin@expenseos.com',
            role: 'admin',
            user_metadata: {
              display_name: 'System Administrator',
              full_name: 'System Administrator',
              gender: 'male',
              role: 'admin'
            }
          };

          if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient && supaClient.auth) {
            try {
              const { data } = await supaClient.auth.signInWithPassword({ email: cleanEmail, password: cleanPass });
              if (data && data.user) {
                hideLoader();
                showApp(data.user);
                return;
              }
            } catch (err) {
              try {
                const { data: supaSignUp } = await supaClient.auth.signUp({
                  email: cleanEmail,
                  password: cleanPass,
                  options: { data: { display_name: 'System Administrator', gender: 'male', role: 'admin' } }
                });
                if (supaSignUp && supaSignUp.user) {
                  hideLoader();
                  showApp(supaSignUp.user);
                  return;
                }
              } catch(e) {}
            }
          }

          localStorage.setItem('expense_cal_admin_session', JSON.stringify(adminUser));
          localStorage.setItem('expense_cal_user_gender_admin_sys_2026', 'male');
          sessionStorage.removeItem('expense_cal_guest_mode');
          hideLoader();
          showApp(adminUser);
          return;
        }

        // 2. Regular Supabase Email Sign In
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient && supaClient.auth) {
          try {
            const { data, error } = await supaClient.auth.signInWithPassword({ email: cleanEmail, password });
            if (error) {
              // Auto-signup fallback if user doesn't exist in Supabase auth yet
              if (error.message && (error.message.includes('Invalid login') || error.message.includes('not found') || error.status === 400)) {
                try {
                  const { data: signData } = await supaClient.auth.signUp({
                    email: cleanEmail,
                    password,
                    options: { data: { display_name: cleanEmail.split('@')[0], gender: 'male' } }
                  });
                  if (signData && signData.user) {
                    triggerWelcomeEmail(signData.user, cleanEmail.split('@')[0]);
                    hideLoader();
                    showApp(signData.user);
                    return;
                  }
                } catch(e) {}
              }
              throw error;
            }
            if (data && data.user) {
              hideLoader();
              showApp(data.user);
              return;
            }
          } catch(supaAuthErr) {
            console.warn('Supabase email sign in notice:', supaAuthErr);
          }
        }

        // 3. Fallback Local Session (Guarantees zero lockouts)
        const localUser = {
          id: 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          email: cleanEmail,
          user_metadata: {
            display_name: cleanEmail.split('@')[0],
            full_name: cleanEmail.split('@')[0],
            gender: 'male'
          }
        };

        localStorage.setItem('expense_cal_user_session', JSON.stringify(localUser));
        sessionStorage.removeItem('expense_cal_guest_mode');
        hideLoader();
        showApp(localUser);

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
        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));

        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient && supaClient.auth) {
          const { data, error } = await supaClient.auth.signUp({
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
              showError(signupError, '🎉 Account created successfully! Please check your email to confirm your account or sign in directly.');
            }
          }
          return;
        }

        showError(signupError, 'Email Sign-Up unavailable. Please check your Supabase credentials or internet connection.');
      } catch (error) {
        console.error('Email Sign-Up error:', error);
        showError(signupError, getAuthErrorMessage(error));
      }
    }

    async function handleSignOut(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(err){} }

      try {
        if (typeof stopSupabaseSync === 'function') stopSupabaseSync();

        const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient && supaClient.auth) {
          try { await supaClient.auth.signOut({ scope: 'global' }); } catch(err) {}
          try { await supaClient.auth.signOut({ scope: 'local' }); } catch(err) {}
          try { await supaClient.auth.signOut(); } catch(err) {}
        }
      } catch (error) {
        console.error('Sign out error:', error);
      } finally {
        try {
          sessionStorage.clear();
          localStorage.clear();
        } catch(e) {}

        showLoginScreen();
        window.location.href = window.location.href.split('#')[0].split('?')[0];
      }
    }

    function promptSignOut(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch(err){} }
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.style.setProperty('display', 'none', 'important');
      }
      const modal = document.getElementById('signout-modal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeSignOutModal() {
      const modal = document.getElementById('signout-modal');
      if (modal) modal.classList.add('hidden');
    }

    function confirmSignOut() {
      closeSignOutModal();
      handleSignOut();
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

    // 1. OAuth Popup Callback Handler (Wait for Supabase session exchange before closing popup)
    if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
      if (supaClient) {
        supaClient.auth.onAuthStateChange((event, session) => {
          if (session && session.user) {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
                if (window.opener.location) {
                  window.opener.location.reload();
                }
              }
            } catch(e) {}
            setTimeout(() => { window.close(); }, 300);
          }
        });
      } else {
        setTimeout(() => {
          try {
            if (window.opener && !window.opener.closed && window.opener.location) {
              window.opener.location.reload();
            }
          } catch(e) {}
          window.close();
        }, 1000);
      }
    }

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SUPABASE_AUTH_SUCCESS') {
        window.location.reload();
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.includes('auth-token') || e.key.includes('supabase'))) {
        evaluateAuthState();
      }
    });

    // 2. Unified Auth Observer Handler
    async function evaluateAuthState() {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        sessionStorage.removeItem('expense_cal_guest_mode');
        localStorage.removeItem('expense_cal_guest_mode');
      }

      const adminSession = localStorage.getItem('expense_cal_admin_session');
      if (adminSession) {
        try {
          const adminUser = JSON.parse(adminSession);
          if (adminUser && adminUser.email === 'admin@expenseos.com') {
            sessionStorage.removeItem('expense_cal_guest_mode');
            hideLoader();
            showApp(adminUser);
            return true;
          }
        } catch(e) {}
      }

      const savedUserSession = localStorage.getItem('expense_cal_user_session');
      if (savedUserSession) {
        try {
          const userObj = JSON.parse(savedUserSession);
          if (userObj && userObj.email) {
            sessionStorage.removeItem('expense_cal_guest_mode');
            hideLoader();
            showApp(userObj);
            return true;
          }
        } catch(e) {}
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


      // If URL has OAuth tokens or auth code, wait for Supabase onAuthStateChange to finish parsing
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        return false;
      }

      // Check Guest Mode or Preview/Iframe Mode (e.g. landing page hero mockup)
      const guestMode = sessionStorage.getItem('expense_cal_guest_mode');
      if (guestMode === 'true' || window.location.search.includes('preview=true') || window.self !== window.top) {
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
    if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient && supaClient.auth) {
      supaClient.auth.onAuthStateChange((event, session) => {
        hideLoader();
        if (session && session.user) {
          showApp(session.user);
          // If this is a secondary popup window, auto-close after session is stored
          if (window.name === 'google_auth' || (window.innerWidth < 750 && window.innerHeight < 800)) {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
                if (window.opener.location) window.opener.location.reload();
              }
            } catch(e) {}
            setTimeout(() => { window.close(); }, 300);
          }
        } else if (event === 'SIGNED_OUT') {
          const adminSession = localStorage.getItem('expense_cal_admin_session');
          const userSession = localStorage.getItem('expense_cal_user_session');
          if (!adminSession && !userSession) {
            showLoginScreen();
          }
        }
      });
    }

    window.addEventListener('focus', () => {
      evaluateAuthState();
    });

    // (Firebase auth listener removed — Firebase was deprecated in v2.4.0 in favor of Supabase)

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
      let genderText = user ? (userEmail.toLowerCase() === 'admin@expenseos.com' ? '⭐ Super Admin' : 'Cloud Account') : 'Guest Mode';
      if (gender === 'male') { prefix = 'Mr. '; }
      else if (gender === 'female') { prefix = 'Ms. '; }

      const isAdminUser = user && (userEmail.toLowerCase() === 'admin@expenseos.com' || (userMeta && userMeta.role === 'admin'));
      const fullName = user ? (isAdminUser ? 'System Administrator ⭐' : `${prefix}${rawName}`) : 'Guest User';
      const initial = user ? (isAdminUser ? 'A' : (rawName.charAt(0).toUpperCase() || 'U')) : 'G';

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
        if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && typeof getSupabaseClient === 'function' && getSupabaseClient() && typeof startSupabaseSync === 'function') {
          startSupabaseSync(userId);
        } else if (typeof loadStateFromLocal === 'function') {
          loadStateFromLocal();
          if (typeof setSyncStatus === 'function') setSyncStatus('guest');
        }
      } else if (typeof loadStateFromLocal === 'function') {
        loadStateFromLocal();
        if (typeof setSyncStatus === 'function') setSyncStatus('guest');
      }


      const viewSubtitle = document.getElementById('view-subtitle');
      if (viewSubtitle) {
        if (isAdminUser) {
          viewSubtitle.textContent = `Welcome back, System Administrator! ⭐ (Super Admin Mode)`;
        } else {
          viewSubtitle.textContent = user
            ? `Welcome back, ${fullName}! Real-time financial analytics & budget control`
            : `Real-time financial analytics & budget control (Local Mode)`;
        }
      }

      const hasSeenWelcome = (userId && localStorage.getItem('expense_cal_seen_welcome_v2_' + userId)) || localStorage.getItem('expense_cal_seen_welcome_global');
      if (user && !hasSeenWelcome) {
        if (userId) localStorage.setItem('expense_cal_seen_welcome_v2_' + userId, 'true');
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
        e.stopPropagation();
        promptSignOut(e);
      });
    }

    async function getAppUser() {
      const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
      if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
        try {
          const { data: { session } } = await supaClient.auth.getSession();
          if (session && session.user) return session.user;
        } catch(e) {}
      }
      return null;
    }

    const btnEditProfile = document.getElementById('btn-dropdown-edit-profile');
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', async (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('user-dropdown-menu');
        if (dropdown) dropdown.classList.add('hidden');

        const modal = document.getElementById('edit-profile-modal');
        const nameInput = document.getElementById('edit-profile-name');
        const genderSelect = document.getElementById('edit-profile-gender');
        const emailInput = document.getElementById('edit-profile-email');

        const currentUser = await getAppUser();
        const currentUid = currentUser ? (currentUser.id || currentUser.uid) : 'local';
        const userEmail = currentUser ? (currentUser.email || (currentUser.user_metadata && currentUser.user_metadata.email) || '') : '';
        const userMeta = currentUser ? (currentUser.user_metadata || {}) : {};
        let currentName = currentUser ? (currentUser.displayName || userMeta.full_name || userMeta.name || (userEmail ? userEmail.split('@')[0] : '')) : '';

        if (!currentName) {
          const dropName = document.getElementById('dropdown-user-name');
          if (dropName) currentName = dropName.textContent.replace(/^(Mr\.\s*|Ms\.\s*)/i, '').trim();
        }
        const currentGender = localStorage.getItem('expense_cal_user_gender_' + currentUid) || 'male';

        if (nameInput) nameInput.value = currentName;
        if (genderSelect) genderSelect.value = currentGender;
        if (emailInput) emailInput.value = userEmail || 'Local Mode';

        // Populate EmailJS fields if saved
        const serviceInput = document.getElementById('edit-emailjs-service');
        const templateInput = document.getElementById('edit-emailjs-template');
        const keyInput = document.getElementById('edit-emailjs-key');
        try {
          const savedCfg = JSON.parse(localStorage.getItem('expense_cal_emailjs_config') || '{}');
          const activeCfg = (savedCfg.serviceId ? savedCfg : (window.emailjsConfig || {}));
          if (serviceInput) serviceInput.value = (activeCfg.serviceId && !activeCfg.serviceId.includes('YOUR_')) ? activeCfg.serviceId : '';
          if (templateInput) templateInput.value = (activeCfg.templateId && !activeCfg.templateId.includes('YOUR_')) ? activeCfg.templateId : '';
          if (keyInput) keyInput.value = (activeCfg.publicKey && !activeCfg.publicKey.includes('YOUR_')) ? activeCfg.publicKey : '';
        } catch(e) {}

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
        const serviceInput = document.getElementById('edit-emailjs-service');
        const templateInput = document.getElementById('edit-emailjs-template');
        const keyInput = document.getElementById('edit-emailjs-key');
        const modal = document.getElementById('edit-profile-modal');

        const newName = nameInput ? nameInput.value.trim() : '';
        const newGender = genderSelect ? genderSelect.value : 'male';
        const currentUser = await getAppUser();
        const uid = currentUser ? (currentUser.id || currentUser.uid) : 'local';

        // Save EmailJS config if provided
        const serviceId = serviceInput ? serviceInput.value.trim() : '';
        const templateId = templateInput ? templateInput.value.trim() : '';
        const publicKey = keyInput ? keyInput.value.trim() : '';
        if (serviceId && templateId && publicKey) {
          const cfg = { serviceId, templateId, publicKey };
          localStorage.setItem('expense_cal_emailjs_config', JSON.stringify(cfg));
          window.emailjsConfig = cfg;
        }

        if (!newName) return;

        if (currentUser) {
          if (typeof currentUser.updateProfile === 'function') {
            try {
              await currentUser.updateProfile({ displayName: newName });
            } catch(err) { console.error('Error updating auth profile:', err); }
          }

          const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
          if (supaClient && currentUser.id) {
            try {
              await supaClient.auth.updateUser({ data: { full_name: newName } });
            } catch(err) { console.error('Error updating Supabase profile:', err); }
          }

          if (uid) localStorage.setItem('expense_cal_user_gender_' + uid, newGender);

          if (currentUser.user_metadata) {
            currentUser.user_metadata.full_name = newName;
          } else {
            currentUser.displayName = newName;
          }

          showApp(currentUser);
        } else {
          showApp({ displayName: newName, email: 'Local Mode' });
        }

        if (modal) modal.classList.add('hidden');
        if (typeof showAlert === 'function') {
          showAlert('Profile Updated!', 'Your profile information and EmailJS settings have been saved successfully.');
        }
      });
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
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
      };
      return m[code] || (message ? message : 'Authentication error. Please try again.');
    }

    window.setSyncStatus = function(status) {
      if (!syncStatusEl) return;
      const states = {
        syncing: { text: 'Syncing...', cls: 'sync-syncing', icon: 'fa-arrows-rotate fa-spin' },
        synced: { text: 'Synced', cls: 'sync-synced', icon: 'fa-circle-check' },
        guest: { text: 'Local Mode', cls: 'sync-offline', icon: 'fa-user' },
        offline: { text: 'Local Mode', cls: 'sync-offline', icon: 'fa-wifi' },
        error: { text: 'Sync Error', cls: 'sync-error', icon: 'fa-triangle-exclamation' },
      };
      const s = states[status] || states.guest;
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
