/**
 * overpassService.js
 *
 * OpenStreetMap Overpass API'den trafik ışığı verisi çeker.
 * DB cache: 24 saat geçerliliği olan traffic_lights tablosu.
 */

const fetch = require('node-fetch');
const { pool } = require('../config/database');

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CACHE_HOURS = 24;

/**
 * Belirtilen koordinat çevresindeki trafik ışıklarını döndürür.
 * Önce DB cache'e bakar, yoksa Overpass'tan çeker.
 */
async function getLightsNearby(lat, lng, radiusM = 100) {
  // 1. DB cache kontrolü
  const cached = await pool.query(
    `SELECT * FROM traffic_lights
     WHERE last_synced > NOW() - INTERVAL '${CACHE_HOURS} hours'
       AND (6371000 * acos(
         COALESCE(
           cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
           + sin(radians($1)) * sin(radians(latitude)),
           -1
         )
       )) < $3`,
    [lat, lng, radiusM * 2] // 2x yarıçap ile cache'i geniş tut
  );

  if (cached.rows.length > 0) {
    // Cache'deki veriden istenen yarıçapta olanları filtrele
    return cached.rows.filter(r => {
      const dist = haversineApprox(lat, lng, r.latitude, r.longitude);
      return dist <= radiusM;
    });
  }

  // 2. Overpass API'den çek (genişletilmiş 150m yarıçap ile cache için)
  try {
    const overpassQuery = `
      [out:json][timeout:10];
      node["highway"="traffic_signals"](around:150,${lat},${lng});
      out body;
    `;

    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 12000,
    });

    if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);

    const data = await response.json();
    const nodes = data.elements || [];

    // 3. DB'ye kaydet (cache)
    const results = [];
    for (const node of nodes) {
      const approachHeading = estimateApproachHeading(node.tags);
      const cycleDuration = estimateCycleDuration(node.tags);

      try {
        const inserted = await pool.query(
          `INSERT INTO traffic_lights
             (osm_node_id, latitude, longitude, city, intersection_name, approach_heading, cycle_duration, green_duration, last_synced)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (osm_node_id) DO UPDATE SET
             last_synced = NOW(),
             intersection_name = EXCLUDED.intersection_name
           RETURNING *`,
          [
            node.id,
            node.lat,
            node.lon,
            node.tags?.['addr:city'] || 'unknown',
            buildIntersectionName(node.tags),
            approachHeading,
            cycleDuration.cycle,
            cycleDuration.green,
          ]
        );
        results.push(inserted.rows[0]);
      } catch (_) {
        // Çakışma durumunda atla
      }
    }

    // 4. İstenen yarıçapta olanları filtrele
    return results.filter(r => haversineApprox(lat, lng, r.latitude, r.longitude) <= radiusM);
  } catch (err) {
    console.error('[Overpass] Hata:', err.message);
    // Overpass başarısız olursa cache'i dene (süresi dolmuş olsa bile)
    const fallback = await pool.query(
      `SELECT * FROM traffic_lights
       WHERE (6371000 * acos(
         COALESCE(
           cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
           + sin(radians($1)) * sin(radians(latitude)),
           -1
         )
       )) < $3`,
      [lat, lng, radiusM]
    );
    return fallback.rows;
  }
}

// Yaklaşık Haversine mesafe (metre)
function haversineApprox(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// OSM etiketlerinden kavşak adı oluştur
function buildIntersectionName(tags = {}) {
  if (tags.name) return tags.name;
  const parts = [];
  if (tags['ref:road']) parts.push(tags['ref:road']);
  if (tags['crossing:street']) parts.push(tags['crossing:street']);
  return parts.join(' / ') || null;
}

// OSM etiketlerinden yaklaşım yönü tahmini
function estimateApproachHeading(tags = {}) {
  // OSM zaman zaman direction etiketi içerir
  const dir = tags.direction || tags['traffic_signals:direction'];
  if (!dir) return null;
  const map = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
  return map[dir.toUpperCase()] ?? null;
}

// OSM etiketlerinden gerçekçi döngü süresi tahmini
function estimateCycleDuration(tags = {}) {
  // Büyük kavşaklar daha uzun döngüye sahip
  const lanes = parseInt(tags['lanes']) || 2;
  if (lanes >= 4) return { cycle: 120, green: 45 };
  if (lanes === 3) return { cycle: 100, green: 38 };
  return { cycle: 80, green: 30 };
}

module.exports = { getLightsNearby };
