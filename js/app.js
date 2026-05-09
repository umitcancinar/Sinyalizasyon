/* app.js — Ana Uygulama Kontrolcüsü */
(function () {
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');

  // ── GPS EVENTS BINDING ───────────────────────────────────────
  window.addEventListener('gps:status', (e) => {
    const { status } = e.detail;
    if (status === 'unavailable' || status === 'error') {
      statusDot.className = 'status-dot';
      statusLabel.textContent = window.i18n ? window.i18n.t('status.init') : 'GPS Hatası';
      statusDot.style.background = 'var(--red)';
    } else if (status === 'starting') {
      statusDot.className = 'status-dot searching';
      statusLabel.textContent = window.i18n ? window.i18n.t('status.init') : 'GPS Başlatılıyor';
    } else if (status === 'tracking') {
      statusDot.className = 'status-dot active';
      statusLabel.textContent = window.i18n ? window.i18n.t('status.tracking') : 'Konum İzleniyor';
    } else if (status === 'searching') {
      statusDot.className = 'status-dot searching';
      statusLabel.textContent = window.i18n ? window.i18n.t('status.searching') : 'Trafik ışığı aranıyor...';
    }
  });

  window.addEventListener('gps:stopped', () => {
    statusDot.className = 'status-dot stopped';
    statusLabel.textContent = window.i18n ? window.i18n.t('status.stopped') : 'Durdu — Eşleştiriliyor';
  });

  // When traffic matches, traffic.js will update UI. We just update the little dot
  if (window.Traffic && window.Traffic.findAndMatchLight) {
    const origTrafficMatch = window.Traffic.findAndMatchLight;
    window.Traffic.findAndMatchLight = async function(...args) {
      statusDot.className = 'status-dot stopped';
      statusLabel.textContent = window.i18n ? window.i18n.t('status.stopped') : 'Eşleştiriliyor...';
      await origTrafficMatch.apply(this, args);
      // if successful (countdown card is visible):
      if (document.getElementById('countdownCard')?.style.display === 'block') {
        statusDot.className = 'status-dot active';
        statusLabel.textContent = window.i18n ? window.i18n.t('status.matched') : 'Trafik ışığı bulundu';
      }
    };
  }

  // ── TURN SIGNAL LOGIC ─────────────────────────────────────────
  document.querySelectorAll('.turn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.turn-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const dir = btn.dataset.dir;
      if (window.GPS) window.GPS.setTurnSignal(dir);
    });
  });

  // ── MENU / PANELS ──────────────────────────────────────────────
  const menuCards = document.querySelectorAll('.menu-card');
  const panels = document.querySelectorAll('.content-panel');

  menuCards.forEach(card => {
    card.addEventListener('click', () => {
      const tab = card.dataset.tab;

      // Close all panels
      panels.forEach(p => p.classList.remove('active'));
      menuCards.forEach(c => c.classList.remove('active'));

      // Open selected
      card.classList.add('active');
      const targetPanel = document.getElementById(`panel${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
        // Scroll to it
        setTimeout(() => targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    });
  });

  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.close;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.remove('active');
      menuCards.forEach(c => c.classList.remove('active'));
    });
  });

  // ── INITIALIZE ───────────────────────────────────────────────
  // GPS izni varsa GPS'i başlat, yoksa uygulama GPS OLMADAN çalışmaya devam etsin
  // ❌ ESKİ KOD: GPS izni yoksa auth.html'e yönlendiriyordu → SONSUZ DÖNGÜ!
  // ✅ YENİ KOD: GPS izni yoksa sadece GPS başlatılmaz, uygulama normal çalışır
  const gpsStatus = localStorage.getItem('sinyal_gps');

  if (gpsStatus === 'granted') {
    // GPS izni verilmiş, başlat
    if (window.GPS) window.GPS.start();
  } else {
    // GPS izni yok — uygulama GPS olmadan çalışır
    // Status bar'ı güncelle
    if (statusDot) statusDot.style.background = 'var(--yellow)';
    if (statusLabel) {
      const noGpsMsg = window.i18n ? window.i18n.t('status.nogps') : 'GPS devre dışı — Ayarlardan açabilirsiniz';
      statusLabel.textContent = noGpsMsg;
    }
    console.info('[App] GPS izni yok, uygulama GPS olmadan çalışıyor. Durum:', gpsStatus);
  }

})();
