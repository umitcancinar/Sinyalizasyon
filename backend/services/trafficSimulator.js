/**
 * trafficSimulator.js
 *
 * Gerçek zamanlı trafik ışığı API'si kamuya açık olmadığından,
 * kavşak parametrelerine göre gerçekçi sayaç simülasyonu üretir.
 *
 * Mantık:
 * - Sistem saatini base alarak deterministik bir faz hesaplar
 * - Aynı kavşakta duran iki kullanıcı aynı sayacı görür (tutarlılık)
 * - Kavşak ID'si seed olarak kullanılır
 */

/**
 * Belirtilen ışık için şu anki countdown bilgisini hesaplar.
 * @param {Object} light - traffic_lights tablosundaki satır
 * @returns {{ phase: 'red'|'green'|'yellow', secondsLeft: number, cycleDuration: number }}
 */
function getCountdown(light) {
  const cycleDuration = light.cycle_duration || 90;
  const greenDuration = light.green_duration || 35;
  const yellowDuration = light.yellow_duration || 5;
  const redDuration = cycleDuration - greenDuration - yellowDuration;

  // Deterministik seed: kavşak ID'si ile UTC saniyelerini hizala
  // Böylece tüm kullanıcılar aynı kavşak için aynı sayacı görür
  const seed = (light.id || light.osm_node_id || 1);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const offset = (seed * 17) % cycleDuration; // Her kavşak farklı fazda başlar
  const positionInCycle = (nowSeconds + offset) % cycleDuration;

  let phase, secondsLeft;

  if (positionInCycle < redDuration) {
    phase = 'red';
    secondsLeft = redDuration - positionInCycle;
  } else if (positionInCycle < redDuration + greenDuration) {
    phase = 'green';
    secondsLeft = redDuration + greenDuration - positionInCycle;
  } else {
    phase = 'yellow';
    secondsLeft = cycleDuration - positionInCycle;
  }

  return {
    phase,
    secondsLeft,
    cycleDuration,
    greenDuration,
    redDuration,
    yellowDuration,
    // Kırmızı fazındaysa yeşile kalan süre
    secondsToGreen: phase === 'red' ? secondsLeft : 0,
    // Yüzde (progress bar için)
    progressPercent: Math.round(((cycleDuration - secondsLeft) / cycleDuration) * 100),
  };
}

module.exports = { getCountdown };
