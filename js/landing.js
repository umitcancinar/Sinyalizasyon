/* landing.js — Landing page animasyonları ve mantığı */
(function () {
  // ── HERO TRAFFIC LIGHT ANIMATION ────────────────────────────
  const lamps = {
    red: document.getElementById('heroLampR'),
    yellow: document.getElementById('heroLampY'),
    green: document.getElementById('heroLampG'),
  };

  let currentPhase = 'green';

  function switchLamp(phase) {
    if (!lamps.red || !lamps.yellow || !lamps.green) return;
    Object.values(lamps).forEach(l => l.classList.remove('active'));
    lamps[phase].classList.add('active');
    currentPhase = phase;
  }

  function heroTrafficLoop() {
    // Start with green (already active)
    setTimeout(() => {
      switchLamp('yellow');
      setTimeout(() => {
        switchLamp('red');
        setTimeout(() => {
          switchLamp('green');
          heroTrafficLoop();
        }, 4000); // red duration
      }, 1500); // yellow duration
    }, 4000); // green duration
  }

  // ── SCROLL ANIMATIONS ─────────────────────────────────────────
  function observeSections() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // observer.unobserve(entry.target); // keep it so it fades in/out if desired, or unobserve
        }
      });
    }, {
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1
    });

    document.querySelectorAll('.fade-section').forEach(sec => {
      observer.observe(sec);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen
    const ls = document.getElementById('loadingScreen');
    if (ls) {
      setTimeout(() => {
        ls.classList.add('hidden');
        setTimeout(() => ls.remove(), 600);
      }, 500);
    }

    if (document.getElementById('heroLampG')) {
      heroTrafficLoop();
    }

    observeSections();

    // Change CTA links if already logged in
    const token = localStorage.getItem('sinyal_token');
    if (token) {
      const ctas = document.querySelectorAll('a[href="auth.html"]');
      ctas.forEach(a => {
        a.href = 'app.html';
        const span = a.querySelector('span[data-i18n]');
        if (span) {
          span.setAttribute('data-i18n', 'nav.app');
          span.textContent = 'Uygulamaya Git';
        } else {
          a.textContent = 'Uygulamaya Git';
        }
      });
    }
  });
})();
