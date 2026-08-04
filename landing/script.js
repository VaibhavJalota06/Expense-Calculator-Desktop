/* ==========================================================================
   Expense OS - 3D Showcase & Interactive Script Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 1. Canvas Starfield Background ----------
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3
      });
    }

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
        ctx.fill();
      });

      requestAnimationFrame(animateParticles);
    }

    animateParticles();
  }

  // ---------- 2. Interactive 3D Perspective Tilt ----------
  const heroMockup = document.querySelector('.hero-mockup');
  const heroWrapper = document.querySelector('.hero-mockup-wrapper');

  if (heroWrapper && heroMockup) {
    heroWrapper.addEventListener('mousemove', (e) => {
      const rect = heroWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateX = (y / (rect.height / 2)) * -10;
      const rotateY = (x / (rect.width / 2)) * 10;

      heroMockup.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    heroWrapper.addEventListener('mouseleave', () => {
      heroMockup.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  }

  // ---------- 3. 3D Tilt for Feature Cards ----------
  const cards = document.querySelectorAll('.feature-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateX = (y / (rect.height / 2)) * -8;
      const rotateY = (x / (rect.width / 2)) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
    });
  });

  // ---------- 4. Gallery Tab Switcher ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const galleryTitle = document.getElementById('gallery-preview-title');
  const galleryDesc = document.getElementById('gallery-preview-desc');
  const galleryUrlTitle = document.getElementById('gallery-url-title');
  const galleryIframe = document.getElementById('gallery-iframe');

  const galleryData = {
    dashboard: {
      title: "Real-Time Financial Dashboard & Analytics",
      desc: "Instant breakdown of monthly income vs expenses, category allocation charts, net balance trends, and recurring subscription trackers.",
      url: "https://expenseos.app/dashboard"
    },
    transactions: {
      title: "Full Transaction Manager & History",
      desc: "View, search, filter, and edit all transactions with date range selectors, category badges, and instant CSV/JSON exports.",
      url: "https://expenseos.app/transactions"
    },
    budgeting: {
      title: "AI Category Rules & Smart Budget Limits",
      desc: "Set monthly target budgets per category with real-time color warnings and automatic transaction classification.",
      url: "https://expenseos.app/budgeting"
    },
    currency: {
      title: "Multi-Currency & Real-Time FX Exchange Rates",
      desc: "Track expenses in USD, EUR, INR, GBP, JPY, CAD and instantly convert balances using live API exchange rates.",
      url: "https://expenseos.app/fx-exchange"
    },
    sync: {
      title: "Supabase Cloud Sync & Zero-Lockout Local DB",
      desc: "Seamlessly synchronizes your data across devices using Supabase cloud PostgreSQL, with 100% offline local fallback.",
      url: "https://expenseos.app/cloud-sync"
    },
    export: {
      title: "Comprehensive Financial Reports & Exports",
      desc: "Export your complete expense data in formatted CSV or JSON at any time for accounting, taxes, or personal archives.",
      url: "https://expenseos.app/reports"
    }
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-tab');
      if (galleryData[target]) {
        if (galleryTitle) galleryTitle.textContent = galleryData[target].title;
        if (galleryDesc) galleryDesc.textContent = galleryData[target].desc;
        if (galleryUrlTitle) galleryUrlTitle.innerHTML = `<i class="fa-solid fa-lock" style="font-size:0.7rem;"></i> ${galleryData[target].url}`;
        if (galleryIframe) {
          galleryIframe.style.opacity = '0.5';
          setTimeout(() => {
            galleryIframe.src = '../web/index.html';
            galleryIframe.style.opacity = '1';
          }, 150);
        }
      }
    });
  });

  // ---------- 5. Live FX Calculator Demo Widget ----------
  const fxAmount = document.getElementById('demo-fx-amount');
  const fxFrom = document.getElementById('demo-fx-from');
  const fxResult = document.getElementById('demo-fx-result');

  const exchangeRates = {
    USD: { INR: 83.5, EUR: 0.92, GBP: 0.79, CAD: 1.36, USD: 1.0 },
    EUR: { INR: 90.7, USD: 1.08, GBP: 0.86, CAD: 1.48, EUR: 1.0 },
    INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, CAD: 0.016, INR: 1.0 },
    GBP: { USD: 1.26, EUR: 1.16, INR: 105.4, CAD: 1.72, GBP: 1.0 },
    CAD: { USD: 0.73, EUR: 0.67, INR: 61.3, GBP: 0.58, CAD: 1.0 }
  };

  function updateFxDemo() {
    if (!fxAmount || !fxFrom || !fxResult) return;
    const amt = parseFloat(fxAmount.value) || 0;
    const curr = fxFrom.value;
    const inrVal = (amt * (exchangeRates[curr] ? exchangeRates[curr]['INR'] : 83.5)).toFixed(2);
    const eurVal = (amt * (exchangeRates[curr] ? exchangeRates[curr]['EUR'] : 0.92)).toFixed(2);
    fxResult.innerHTML = `₹${inrVal} INR &nbsp;|&nbsp; €${eurVal} EUR`;
  }

  if (fxAmount) fxAmount.addEventListener('input', updateFxDemo);
  if (fxFrom) fxFrom.addEventListener('change', updateFxDemo);
  updateFxDemo();

  // ---------- 6. Quick Expense Simulator Widget ----------
  const simName = document.getElementById('demo-sim-name');
  const simResult = document.getElementById('demo-sim-result');

  const categoryRules = [
    { keywords: ['coffee', 'starbucks', 'mcdonalds', 'pizza', 'burger', 'food', 'restaurant', 'cafe', 'dinner'], cat: 'Food & Dining', icon: 'fa-utensils', color: 'var(--accent-cyan)' },
    { keywords: ['uber', 'flight', 'airline', 'cab', 'bus', 'train', 'fuel', 'petrol', 'parking'], cat: 'Travel & Transport', icon: 'fa-plane', color: 'var(--primary-bright)' },
    { keywords: ['netflix', 'spotify', 'amazon', 'hulu', 'disney', 'youtube', 'subscription'], cat: 'Subscriptions', icon: 'fa-film', color: 'var(--accent-purple)' },
    { keywords: ['electricity', 'water', 'internet', 'rent', 'power', 'bill'], cat: 'Utilities & Housing', icon: 'fa-bolt', color: '#f59e0b' }
  ];

  function updateSimDemo() {
    if (!simName || !simResult) return;
    const val = simName.value.toLowerCase().trim();
    let found = categoryRules.find(r => r.keywords.some(k => val.includes(k)));
    if (!found) {
      found = { cat: 'General & Miscellaneous', icon: 'fa-tags', color: 'var(--text-high)' };
    }
    simResult.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-dim);">Auto-Detected Category</div>
      <div style="font-size:1.1rem; font-weight:700; color:${found.color};"><i class="fa-solid ${found.icon}"></i> ${found.cat}</div>
    `;
  }

  if (simName) simName.addEventListener('input', updateSimDemo);

  // ---------- 7. Mobile Navbar Toggle ----------
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ---------- 8. Smooth Scroll ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (navLinks) navLinks.classList.remove('active');
        }
      }
    });
  });

  // ---------- 9. Navbar Glassmorphism Scroll Effect ----------
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(8, 10, 15, 0.95)';
      navbar.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';
    } else {
      navbar.style.background = 'rgba(12, 16, 26, 0.75)';
      navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
    }
  });

});
