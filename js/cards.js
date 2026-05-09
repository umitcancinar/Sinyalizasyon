/* cards.js — Bilgi Kartları (swipe + otomatik geçiş) */
(function () {
  let cards = [];
  let currentIdx = 0;
  let autoTimer = null;
  const AUTO_SECS = 15;
  let autoProgress = 0;

  const viewport  = document.getElementById('cardsViewport');
  const dotsEl    = document.getElementById('cardsDots');
  const prevBtn   = document.getElementById('cardsPrev');
  const nextBtn   = document.getElementById('cardsNext');
  const autoFill  = document.getElementById('cardsAutoFill');

  // ── LOAD FROM BACKEND ────────────────────────────────────────
  async function loadCards() {
    const API = window.SINYAL_API || 'http://localhost:3002/api';
    try {
      const res = await fetch(`${API}/content/cards`);
      if (!res.ok) throw new Error();
      cards = await res.json();
    } catch (_) {
      // Fallback inline cards
      cards = [
        { id:1, emoji:'🍯', title_tr:'Balın Sırrı', title_en:"Honey's Secret", content_tr:'Bal hiç bozulmaz! Mısır piramitlerinde 3.000 yıllık bal bulundu ve hâlâ yenilebilir durumdaydı.', content_en:'Honey never spoils! 3,000-year-old honey found in Egyptian pyramids was still edible.', category:'nature' },
        { id:2, emoji:'🐙', title_tr:'Ahtapotun Kalbi', title_en:'Octopus Hearts', content_tr:'Ahtapotların üç kalbi vardır; ikisi solungaçlara, biri ise vücudun geri kalanına kan pompalar.', content_en:'Octopuses have three hearts — two pump blood through gills, one to the rest of the body.', category:'nature' },
        { id:3, emoji:'🌌', title_tr:'Uzay Sessizliği', title_en:'Space Silence', content_tr:'Uzayda ses yoktur. Bir uzay gemisi patladığında, 1 metre ötedeki başka bir gemi hiçbir şey duymaz.', content_en:'There is no sound in space. A ship 1m away would hear nothing if another exploded.', category:'space' },
        { id:4, emoji:'❄️', title_tr:'Kar Taneleri', title_en:'Snowflakes', content_tr:'Hiçbir kar tanesi birbirinin aynısı değildir. Her biri benzersiz bir kristal yapıya sahiptir.', content_en:'No two snowflakes are alike. Each has a unique crystal structure.', category:'science' },
        { id:5, emoji:'📡', title_tr:"WiFi'nin Kökeni", title_en:"WiFi's Origin", content_tr:'WiFi teknolojisi, kara delik radyo dalgalarını tespit etmek için geliştirilen algoritmadan doğdu.', content_en:'WiFi was born from an algorithm developed to detect radio waves from black holes.', category:'technology' },
        { id:6, emoji:'🧠', title_tr:'Uyuyan Beyin', title_en:'Sleeping Brain', content_tr:'Beyin, uykuda uyanıkken olduğundan daha aktiftir. Hayalleriniz, beyin aktivitesinin zirve noktasıdır.', content_en:'The brain is more active during sleep than wakefulness. Dreams are its peak activity.', category:'science' },
        { id:7, emoji:'🐝', title_tr:'Arıların Navigasyonu', title_en:'Bee Navigation', content_tr:'Arılar güneşin konumunu kullanarak hassas navigasyon yapar; GPS\'siz 15 km uzağa gidip geri dönerler.', content_en:'Bees navigate using the sun\'s position and travel 15 km away without GPS.', category:'nature' },
        { id:8, emoji:'💨', title_tr:'Rüzgar Rekoru', title_en:'Wind Record', content_tr:'Dünyadaki en hızlı rüzgar 1999\'da Oklahoma\'da ölçüldü: saatte 484 km!', content_en:'The fastest wind ever recorded was 484 km/h in Oklahoma, 1999!', category:'nature' },
      ];
    }
    renderCards();
  }

  function renderCards() {
    if (!viewport) return;
    viewport.innerHTML = '';

    const lang = window.i18n ? window.i18n.getLang() : 'tr';

    cards.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'info-card-slide' + (idx === 0 ? ' active' : '');
      el.dataset.idx = idx;
      el.innerHTML = `
        <div>
          <div class="info-card-emoji">${card.emoji || '💡'}</div>
          <p class="info-card-cat">${card.category || ''}</p>
          <h3 class="info-card-title">${lang === 'en' ? card.title_en : card.title_tr}</h3>
          <p class="info-card-content">${lang === 'en' ? card.content_en : card.content_tr}</p>
        </div>`;
      viewport.appendChild(el);
    });

    renderDots();
    startAuto();
  }

  function renderDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    cards.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = 'cards-dot' + (idx === currentIdx ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', idx === currentIdx);
      dot.setAttribute('aria-label', `Kart ${idx + 1}`);
      dot.addEventListener('click', () => goTo(idx));
      dotsEl.appendChild(dot);
    });
  }

  function goTo(idx) {
    if (!cards.length) return;
    const slides = viewport.querySelectorAll('.info-card-slide');
    slides[currentIdx]?.classList.remove('active');
    slides[currentIdx]?.classList.add('leaving');
    setTimeout(() => slides[currentIdx]?.classList.remove('leaving'), 400);

    currentIdx = (idx + cards.length) % cards.length;
    slides[currentIdx]?.classList.add('active');

    dotsEl.querySelectorAll('.cards-dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentIdx);
      d.setAttribute('aria-selected', i === currentIdx);
    });

    resetAuto();
  }

  prevBtn?.addEventListener('click', () => goTo(currentIdx - 1));
  nextBtn?.addEventListener('click', () => goTo(currentIdx + 1));

  // Touch/swipe support
  let touchStartX = 0;
  viewport?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  viewport?.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(currentIdx + (dx < 0 ? 1 : -1));
  });

  // Auto-advance
  function startAuto() {
    clearInterval(autoTimer);
    autoProgress = 0;
    autoTimer = setInterval(() => {
      autoProgress += 100 / (AUTO_SECS * 10);
      if (autoFill) autoFill.style.width = `${Math.min(100, autoProgress)}%`;
      if (autoProgress >= 100) goTo(currentIdx + 1);
    }, 100);
  }

  function resetAuto() {
    autoProgress = 0;
    if (autoFill) autoFill.style.width = '0%';
    startAuto();
  }

  // Re-render on language change
  window.addEventListener('langchange', () => {
    if (cards.length) renderCards();
  });

  loadCards();
  window.Cards = { loadCards, goTo };
})();
