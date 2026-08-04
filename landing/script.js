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

      const rotateX = (y / (rect.height / 2)) * -12; // Rotate pitch up to 12 deg
      const rotateY = (x / (rect.width / 2)) * 12;   // Rotate yaw up to 12 deg

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
  const previewImg = document.getElementById('gallery-preview-img');
  const previewTitle = document.getElementById('gallery-preview-title');
  const previewDesc = document.getElementById('gallery-preview-desc');

  const galleryData = {
    dashboard: {
      title: "Real-Time Financial Dashboard & Analytics",
      desc: "Instant breakdown of monthly income vs expenses, category allocation charts, net balance trends, and recurring subscription trackers.",
      img: "../web/index.html"
    },
    budgeting: {
      title: "AI Category Rules & Smart Budget Limits",
      desc: "Set monthly target budgets per category with real-time color warnings and automatic transaction classification.",
      img: "../web/index.html"
    },
    currency: {
      title: "Multi-Currency & Real-Time FX Exchange Rates",
      desc: "Track expenses in USD, EUR, INR, GBP, JPY, CAD and instantly convert balances using live API exchange rates.",
      img: "../web/index.html"
    },
    sync: {
      title: "Supabase Cloud Sync & Zero-Lockout Local DB",
      desc: "Seamlessly synchronizes your data across devices using Supabase cloud PostgreSQL, with 100% offline local fallback.",
      img: "../web/index.html"
    }
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-tab');
      if (galleryData[target]) {
        if (previewTitle) previewTitle.textContent = galleryData[target].title;
        if (previewDesc) previewDesc.textContent = galleryData[target].desc;
      }
    });
  });

  // ---------- 5. Navbar Scroll Glassmorphism Effect ----------
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.background = 'rgba(8, 10, 15, 0.9)';
      navbar.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';
    } else {
      navbar.style.background = 'rgba(12, 16, 26, 0.75)';
      navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5)';
    }
  });

});
