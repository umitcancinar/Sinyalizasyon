/**
 * gps.js — GPS izleme + YÖN BAZLI duruş algılama
 *
 * AŞAMA 1: watchPosition ile konum buffer doldur
 * AŞAMA 2: Son noktalardan bearing (heading) hesapla
 * AŞAMA 3: Hız + konum varyansı ile "durdu" tespiti
 * AŞAMA 4: turnSignal ile finalHeading hesapla
 * → traffic.js'e STOPPED eventi gönder
 */
(function () {
  const BUFFER_SIZE   = 6;    // Son kaç nokta tutulsun
  const STOP_SPEED    = 1.0;  // m/s altı = durma adayı
  const STOP_VARIANCE = 12;   // metre — konum değişimi eşiği
  const STOP_SECONDS  = 8;    // Bu kadar süre sonra "durdu" say
  const POLL_MS       = 2000; // watchPosition update bekleme (tahmini)

  let watchId      = null;
  let buffer       = [];      // { lat, lng, speed, timestamp }
  let stoppedSince = null;    // null veya timestamp
  let isStopped    = false;
  let currentHeading = 0;     // Son hesaplanan araç yönü (0-360°)
  let turnSignal   = 'straight';

  // ── UTILS ──────────────────────────────────────────────────
  function toRad(d) { return d * Math.PI / 180; }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /** İki nokta arasındaki bearing (0-360°) */
  function bearing(lat1, lon1, lat2, lon2) {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  /** Buffer'daki son N nokta arasındaki max mesafe */
  function bufferVariance(buf) {
    if (buf.length < 2) return 0;
    const recent = buf.slice(-4);
    let maxDist = 0;
    for (let i = 0; i < recent.length; i++) {
      for (let j = i + 1; j < recent.length; j++) {
        const d = haversine(recent[i].lat, recent[i].lng, recent[j].lat, recent[j].lng);
        if (d > maxDist) maxDist = d;
      }
    }
    return maxDist;
  }

  /** Buffer'daki son iki nokta arasındaki heading */
  function computeHeading(buf) {
    if (buf.length < 2) return 0;
    const a = buf[buf.length - 2];
    const b = buf[buf.length - 1];
    // Anlamlı bir mesafe varsa hesapla (gürültüyü önler)
    const dist = haversine(a.lat, a.lng, b.lat, b.lng);
    if (dist < 3) return currentHeading; // çok küçük hareket, eski yönü koru
    return bearing(a.lat, a.lng, b.lat, b.lng);
  }

  /** Dönüş sinyal offsetiyle finalHeading hesapla */
  function finalHeading() {
    let offset = 0;
    if (turnSignal === 'left')  offset = -45;
    if (turnSignal === 'right') offset = +45;
    return (currentHeading + offset + 360) % 360;
  }

  // ── GPS WATCH ───────────────────────────────────────────────
  function start() {
    if (!('geolocation' in navigator)) {
      console.warn('[GPS] Geolocation desteklenmiyor.');
      emitStatus('unavailable');
      return;
    }

    emitStatus('starting');

    watchId = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );

    // DeviceOrientation desteği varsa compass heading kullan
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientationabsolute', onOrientation, true);
      window.addEventListener('deviceorientation', onOrientation, true);
    }
  }

  function stop() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  function onPosition(pos) {
    const { latitude: lat, longitude: lng, speed, accuracy } = pos.coords;
    const now = Date.now();

    // Çok düşük doğrulukta noktaları atla (kentsel kanyon)
    if (accuracy > 80) return;

    const point = { lat, lng, speed: speed ?? null, timestamp: now };
    buffer.push(point);
    if (buffer.length > BUFFER_SIZE) buffer.shift();

    // Heading güncelle (GPS hızı yoksa buffer'dan hesapla)
    if (speed !== null && speed > 2) {
      // Hareket halindeyken buffer'dan heading hesapla
      currentHeading = computeHeading(buffer);
    }

    emitStatus('tracking', { lat, lng, accuracy });

    // ── DURUŞ TESPİTİ ────────────────────────────────────────
    const speedOk    = (speed !== null && speed < STOP_SPEED);
    const variance   = bufferVariance(buffer);
    const varOk      = variance < STOP_VARIANCE;
    const bufFull    = buffer.length >= 3;

    const likelyStopped = bufFull && varOk && (speedOk || speed === null);

    if (likelyStopped && !stoppedSince) {
      stoppedSince = now;
    } else if (!likelyStopped) {
      stoppedSince = null;
      if (isStopped) {
        isStopped = false;
        emitMoving();
      }
    }

    if (stoppedSince && !isStopped) {
      const elapsed = (now - stoppedSince) / 1000;
      if (elapsed >= STOP_SECONDS) {
        isStopped = true;
        emitStopped({ lat, lng });
      } else {
        emitStatus('searching');
      }
    }
  }

  function onError(err) {
    console.error('[GPS] Hata:', err.code, err.message);
    const msgs = {
      1: 'GPS izni reddedildi.',
      2: 'Konum alınamadı.',
      3: 'GPS zaman aşımı.',
    };
    emitStatus('error', { message: msgs[err.code] || 'GPS hatası.' });
  }

  let compassHeading = null;
  function onOrientation(e) {
    // iOS: webkitCompassHeading, Android: e.alpha (absolut)
    if (e.webkitCompassHeading !== undefined) {
      compassHeading = e.webkitCompassHeading;
    } else if (e.absolute && e.alpha !== null) {
      compassHeading = (360 - e.alpha) % 360;
    }
    // Hareket halinde GPS heading'i güncelle
    if (!isStopped && compassHeading !== null) {
      currentHeading = compassHeading;
    }
  }

  // ── EVENTS ───────────────────────────────────────────────────
  function emitStatus(status, detail = {}) {
    window.dispatchEvent(new CustomEvent('gps:status', { detail: { status, ...detail } }));
  }
  function emitStopped(pos) {
    window.dispatchEvent(new CustomEvent('gps:stopped', {
      detail: {
        lat: pos.lat,
        lng: pos.lng,
        heading: currentHeading,
        finalHeading: finalHeading(),
        turnSignal,
      }
    }));
  }
  function emitMoving() {
    window.dispatchEvent(new CustomEvent('gps:moving'));
  }

  // ── TURN SIGNAL API ──────────────────────────────────────────
  function setTurnSignal(dir) {
    turnSignal = dir; // 'left' | 'straight' | 'right'
    window.dispatchEvent(new CustomEvent('gps:turnsignal', { detail: { turnSignal } }));
    // Eğer zaten durmuşsak, yeni yönde tekrar eşleştir
    if (isStopped && buffer.length > 0) {
      const last = buffer[buffer.length - 1];
      emitStopped({ lat: last.lat, lng: last.lng });
    }
  }

  function getLastPosition() {
    if (buffer.length === 0) return null;
    return buffer[buffer.length - 1];
  }

  // ── PUBLIC API ────────────────────────────────────────────────
  window.GPS = { start, stop, setTurnSignal, getLastPosition, isStopped: () => isStopped };
})();
