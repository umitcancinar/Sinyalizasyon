/**
 * trafficController.js
 *
 * YÖN BAZLI TRAFİK IŞIĞI EŞLEŞTİRME:
 *
 * Problem: Kullanıcı 50m yarıçapta en yakın ışığı sorsa, karşı şeridin veya
 * dik açılı bir yolun ışığını getirebilir. Bu yanlış sayaç gösterir.
 *
 * Çözüm:
 * 1. Overpass API'den 100m yarıçap içindeki TÜM ışıkları getir
 * 2. Kullanıcının heading'i ve turnSignal'ı ile finalHeading hesapla
 * 3. Her ışık için kullanıcı→ışık bearing hesapla
 * 4. |finalHeading - bearingToLight| < 60° ise "rotamda" say
 * 5. |delta| > 120° ise "karşı yön" say, ELEME
 * 6. Aday ışıklar arasından en yakını döndür
 */

const overpassService = require('../services/overpassService');
const trafficSimulator = require('../services/trafficSimulator');
const { pool } = require('../config/database');

// Haversine mesafe (metre)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

// İki nokta arasındaki bearing (0-360°)
function bearingBetween(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// İki açı arasındaki en küçük fark (-180 .. +180)
function angleDiff(a, b) {
  let d = ((b - a + 540) % 360) - 180;
  return d;
}

/**
 * GET /api/traffic/nearby
 * Query: lat, lng, heading (0-360°), turnSignal ('left'|'straight'|'right')
 */
async function getNearbyLights(req, res) {
  const { lat, lng, heading, turnSignal = 'straight' } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat ve lng parametreleri zorunlu.' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const userHeading = parseFloat(heading) || 0;

  // Dönüş sinyaline göre finalHeading hesapla
  let headingOffset = 0;
  if (turnSignal === 'left') headingOffset = -45;
  else if (turnSignal === 'right') headingOffset = 45;
  const finalHeading = (userHeading + headingOffset + 360) % 360;

  try {
    // 1. Overpass'tan 100m yarıçapta ışıkları çek (DB cache dahil)
    const allLights = await overpassService.getLightsNearby(userLat, userLng, 100);

    if (allLights.length === 0) {
      return res.json({ found: false, message: 'Yakında trafik ışığı bulunamadı.' });
    }

    // 2. Her ışık için yön filtrelemesi
    const candidates = [];
    for (const light of allLights) {
      const dist = haversineDistance(userLat, userLng, light.latitude, light.longitude);
      const bearingToLight = bearingBetween(userLat, userLng, light.latitude, light.longitude);
      const delta = angleDiff(finalHeading, bearingToLight);
      const absDelta = Math.abs(delta);

      // Eğer ışığın kendi approach_heading'i biliniyorsa onu da kontrol et
      // (Karşı yönden gelen trafik bu ışığa bakıyor demek)
      let directionScore = absDelta;
      if (light.approach_heading !== null) {
        // Işığın approach_heading'i kullanıcı yönüne yakınsa,
        // bu ışık kullanıcıya dönük → doğru ışık
        const approachDelta = Math.abs(angleDiff(finalHeading, light.approach_heading));
        directionScore = Math.min(absDelta, approachDelta);
      }

      // Karşı şerit kontrolü: >120° fark = karşı yön = eleme
      if (directionScore > 120) {
        continue; // Bu ışığı atla
      }

      candidates.push({
        ...light,
        distance: Math.round(dist),
        bearingToLight: Math.round(bearingToLight),
        directionScore: Math.round(directionScore),
      });
    }

    if (candidates.length === 0) {
      return res.json({
        found: false,
        message: 'Rotanızda trafik ışığı bulunamadı.',
        debug: { totalFound: allLights.length, filteredOut: allLights.length }
      });
    }

    // 3. En yakın adayı seç (mesafe öncelikli, eşitlikte yön puanı)
    candidates.sort((a, b) => {
      if (Math.abs(a.distance - b.distance) < 15) {
        return a.directionScore - b.directionScore; // Çok yakınsa yön puanına bak
      }
      return a.distance - b.distance;
    });

    const best = candidates[0];

    // 4. Simülasyon ile sayaç hesapla
    const countdown = trafficSimulator.getCountdown(best);

    res.json({
      found: true,
      light: {
        id: best.id,
        latitude: best.latitude,
        longitude: best.longitude,
        intersection_name: best.intersection_name || 'Bilinmeyen Kavşak',
        distance: best.distance,
        directionScore: best.directionScore,
      },
      countdown,
      candidates: candidates.length,
    });
  } catch (err) {
    console.error('[Traffic] getNearbyLights hata:', err.message);
    res.status(500).json({ error: 'Trafik verisi alınamadı.' });
  }
}

/**
 * POST /api/traffic/stop
 * Duruş eventi kaydet
 */
async function recordStop(req, res) {
  const { latitude, longitude, heading, turn_signal, traffic_light_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO stop_events (user_id, latitude, longitude, heading, turn_signal, traffic_light_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, latitude, longitude, heading, turn_signal || 'straight', traffic_light_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Traffic] recordStop hata:', err.message);
    res.status(500).json({ error: 'Kayıt hatası.' });
  }
}

module.exports = { getNearbyLights, recordStop };
