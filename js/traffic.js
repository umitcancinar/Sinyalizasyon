/**
 * traffic.js — Trafik ışığı eşleştirme + sayaç yönetimi
 * gps.js'den gelen 'gps:stopped' eventini dinler,
 * backend'e heading + turnSignal ile istek atar,
 * gelen sayaç verisini her saniye günceller.
 */
(function () {
  let countdownInterval = null;
  let currentLight      = null;
  let countdownState    = null; // Backend'den gelen son veri

  // ── GPS EVENTS ───────────────────────────────────────────────
  window.addEventListener('gps:stopped', async (e) => {
    const { lat, lng, heading, finalHeading, turnSignal } = e.detail;
    await findAndMatchLight(lat, lng, finalHeading, turnSignal);
  });

  window.addEventListener('gps:moving', () => {
    clearCountdown();
    hideCountdownUI();
  });

  window.addEventListener('gps:turnsignal', async (e) => {
    if (!GPS.isStopped()) return;
    const pos = GPS.getLastPosition();
    if (!pos) return;
    // turnSignal değişti, offset ile yeniden hesapla
    const hOffset = e.detail.turnSignal === 'left' ? -45 : e.detail.turnSignal === 'right' ? 45 : 0;
    const newFinal = ((pos.heading || 0) + hOffset + 360) % 360;
    await findAndMatchLight(pos.lat, pos.lng, newFinal, e.detail.turnSignal);
  });

  // ── FIND LIGHT ───────────────────────────────────────────────
  async function findAndMatchLight(lat, lng, heading, turnSignal) {
    const API = window.SINYAL_API || 'http://localhost:3002/api';
    try {
      const params = new URLSearchParams({
        lat: lat.toFixed(7),
        lng: lng.toFixed(7),
        heading: Math.round(heading),
        turnSignal: turnSignal || 'straight',
      });

      const res = await fetch(`${API}/traffic/nearby?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.found) {
        console.info('[Traffic] Rotada ışık bulunamadı:', data.message);
        return;
      }

      currentLight    = data.light;
      countdownState  = data.countdown;

      showCountdownUI(data);
      startLocalCountdown(data.countdown);

      // Stop event'ini kaydet (opsiyonel, giriş yapıldıysa)
      const token = window.Auth?.getToken();
      if (token) {
        fetch(`${API}/traffic/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: lat, longitude: lng,
            heading: Math.round(heading),
            turn_signal: turnSignal,
            traffic_light_id: data.light.id,
          }),
        }).catch(() => {}); // sessiz fail
      }

    } catch (err) {
      console.error('[Traffic] findAndMatchLight hata:', err.message);
    }
  }

  // ── LOCAL COUNTDOWN ──────────────────────────────────────────
  /**
   * Backend'den gelen secondsLeft'i client'ta her saniye düşürür.
   * Her 30 saniyede bir backend'den taze veri alır.
   */
  function startLocalCountdown(initial) {
    clearCountdown();

    let state = { ...initial };
    let refreshCounter = 0;

    updateCountdownDOM(state);

    countdownInterval = setInterval(async () => {
      refreshCounter++;

      // Her 30sn'de backend'ten tazele
      if (refreshCounter % 30 === 0 && currentLight) {
        const pos = GPS.getLastPosition();
        if (pos) {
          try {
            const API = window.SINYAL_API || 'http://localhost:3002/api';
            const params = new URLSearchParams({
              lat: pos.lat.toFixed(7), lng: pos.lng.toFixed(7),
              heading: 0, turnSignal: 'straight',
            });
            const res = await fetch(`${API}/traffic/nearby?${params}`);
            if (res.ok) {
              const d = await res.json();
              if (d.found) { state = d.countdown; updateCountdownDOM(state); return; }
            }
          } catch (_) {}
        }
      }

      // Yerel sayaç düşür
      state.secondsLeft = Math.max(0, state.secondsLeft - 1);
      state.secondsToGreen = state.phase === 'red' ? state.secondsLeft : 0;

      // Faz geçişi
      if (state.secondsLeft === 0) {
        if (state.phase === 'red') {
          state.phase = 'green';
          state.secondsLeft = state.greenDuration;
        } else if (state.phase === 'green') {
          state.phase = 'yellow';
          state.secondsLeft = state.yellowDuration;
        } else {
          state.phase = 'red';
          state.secondsLeft = state.redDuration;
        }
      }

      state.progressPercent = Math.round(
        ((state.cycleDuration - state.secondsLeft) / state.cycleDuration) * 100
      );

      updateCountdownDOM(state);
    }, 1000);
  }

  function clearCountdown() {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  }

  // ── DOM UPDATES ───────────────────────────────────────────────
  function showCountdownUI(data) {
    const idleCard    = document.getElementById('idleCard');
    const cdCard      = document.getElementById('countdownCard');
    const menuGrid    = document.getElementById('menuGrid');

    if (idleCard)  { idleCard.classList.remove('visible'); idleCard.style.display = 'none'; }
    if (cdCard)    { cdCard.style.display = 'block'; }
    if (menuGrid)  { menuGrid.style.display = 'grid'; }

    // Location info
    const nameEl = document.getElementById('lightName');
    const distEl = document.getElementById('lightDistance');
    if (nameEl) nameEl.textContent = data.light.intersection_name || (window.i18n ? window.i18n.t('light.unknown') : 'Kavşak');
    if (distEl) distEl.textContent = data.light.distance + 'm';
  }

  function hideCountdownUI() {
    const idleCard = document.getElementById('idleCard');
    const cdCard   = document.getElementById('countdownCard');
    const menuGrid = document.getElementById('menuGrid');
    // Close open panels too
    document.querySelectorAll('.content-panel.active').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-card.active').forEach(c => c.classList.remove('active'));

    if (cdCard)   cdCard.style.display = 'none';
    if (menuGrid) menuGrid.style.display = 'none';
    if (idleCard) { idleCard.style.display = 'block'; idleCard.classList.add('visible'); }
  }

  function updateCountdownDOM(state) {
    const { phase, secondsLeft, progressPercent } = state;
    const lang = window.i18n ? window.i18n.getLang() : 'tr';

    // Phase labels
    const phaseLabels = {
      tr: { red: 'Kırmızı Işık', green: 'Yeşil Işık', yellow: 'Sarı Işık' },
      en: { red: 'Red Light',    green: 'Green Light', yellow: 'Yellow Light' },
    };
    const subLabels = {
      tr: { red: 'yeşile kalan süre', green: 'yeşil — geçebilirsiniz', yellow: 'sarı — yavaşlayın' },
      en: { red: 'until green',       green: 'green — you may go',      yellow: 'yellow — slow down' },
    };

    // Format time MM:SS
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    // Update card
    const card = document.getElementById('countdownCard');
    if (card) card.setAttribute('data-phase', phase);

    const timeEl  = document.getElementById('countdownTime');
    const phaseEl = document.getElementById('phaseLabel');
    const subEl   = document.getElementById('subLabel');
    const fillEl  = document.getElementById('progressFill');
    const progBar = document.getElementById('progressBar');

    if (timeEl)  timeEl.textContent = timeStr;
    if (phaseEl) phaseEl.textContent = phaseLabels[lang]?.[phase] || phase;
    if (subEl)   subEl.textContent   = subLabels[lang]?.[phase]   || '';
    if (fillEl)  fillEl.style.width  = `${progressPercent}%`;
    if (progBar) progBar.setAttribute('aria-valuenow', progressPercent);

    // Header countdown widget
    const hWidget = document.getElementById('headerCountdown');
    const hTime   = document.getElementById('headerCountdownTime');
    if (hWidget) { hWidget.style.display = 'flex'; hWidget.setAttribute('data-phase', phase); }
    if (hTime)   hTime.textContent = timeStr;
  }

  window.Traffic = { findAndMatchLight, clearCountdown };
})();
