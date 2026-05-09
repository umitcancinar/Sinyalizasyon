const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { pool } = require('../config/database');

// Seed: varsayılan hızlı arama kişileri, bilgi kartları, mesaj şablonları
async function seed() {
  const client = await pool.connect();
  try {
    // Quick Contacts
    await client.query(`
      INSERT INTO quick_contacts (name_tr, name_en, phone, category, icon, sort_order)
      VALUES
        ('Acil Yardım', 'Emergency', '112', 'emergency', '🚨', 1),
        ('Polis', 'Police', '155', 'emergency', '👮', 2),
        ('İtfaiye', 'Fire Dept.', '110', 'emergency', '🚒', 3),
        ('Jandarma', 'Gendarmerie', '156', 'emergency', '⚔️', 4),
        ('Yol Yardım', 'Road Assist', '182', 'roadside', '🔧', 5),
        ('ALO 153 Trafik', 'Traffic Hotline', '153', 'roadside', '🚦', 6),
        ('SABİM 150', 'Gov. Help', '150', 'government', '🏛️', 7),
        ('ALO 170 Çevre', 'Environment', '170', 'government', '🌿', 8)
      ON CONFLICT DO NOTHING;
    `);

    // Message Templates
    await client.query(`
      INSERT INTO message_templates (content_tr, content_en, emoji, sort_order)
      VALUES
        ('Trafiğe takıldım, biraz geç kalacağım 🚗', 'Stuck in traffic, will be a bit late 🚗', '🚗', 1),
        ('Yaklaşık 5 dakika içinde orada olacağım.', 'I will be there in about 5 minutes.', '⏱️', 2),
        ('Yoldayım, kısa süre sonra ulaşırım.', 'On my way, will arrive shortly.', '🛣️', 3),
        ('Trafik ışığında bekliyorum, hemen gidiyorum.', 'Waiting at traffic light, leaving now.', '🚦', 4),
        ('Park yeri arıyorum, biraz geç kalabilirim.', 'Looking for parking, might be a bit late.', '🅿️', 5),
        ('Her şey yolunda, yoldayım.', 'All good, on my way.', '✅', 6)
      ON CONFLICT DO NOTHING;
    `);

    // Info Cards
    await client.query(`
      INSERT INTO info_cards (title_tr, title_en, content_tr, content_en, category, emoji, sort_order)
      VALUES
        ('Balların Sırrı', 'Honey''s Secret', 'Bal hiç bozulmaz. Mısır piramitlerinde 3.000 yıllık bal bulundu ve hâlâ yenilebilir durumdaydı!', 'Honey never spoils. 3,000-year-old honey was found in Egyptian pyramids and was still edible!', 'nature', '🍯', 1),
        ('Ahtapotun Kalbi', 'Octopus Hearts', 'Ahtapotların üç kalbi vardır; ikisi solungaçlara, biri ise vücudun geri kalanına kan pompalar.', 'Octopuses have three hearts; two pump blood through the gills, one pumps it to the rest of the body.', 'nature', '🐙', 2),
        ('Uzay Sessizliği', 'Space Silence', 'Uzayda ses yoktur. Bir uzay gemisi patladığında, 1 metre ötedeki başka bir gemi hiçbir şey duymaz.', 'There is no sound in space. If a spaceship exploded, another ship 1 meter away would hear nothing.', 'space', '🌌', 3),
        ('Kar Taneleri', 'Snowflakes', 'Hiçbir kar tanesi birbirinin aynısı değildir. Her biri benzersiz bir kristal yapıya sahiptir.', 'No two snowflakes are identical. Each has a unique crystal structure.', 'science', '❄️', 4),
        ('Wifi''nin Kökeni', 'WiFi''s Origin', 'WiFi teknolojisi, astronomi araştırmaları sırasında kara delik radyo dalgalarını tespit etmek için geliştirilen algoritmadan doğdu.', 'WiFi technology was born from an algorithm developed to detect radio waves from black holes during astronomy research.', 'technology', '📡', 5),
        ('Dil Parmak İzi', 'Tongue Fingerprint', 'Her insanın dili parmak izi gibi benzersizdir. Biometrik kimlik doğrulama için kullanılabilir!', 'Every person''s tongue is unique like a fingerprint. It can be used for biometric authentication!', 'science', '👅', 6),
        ('Arıların Navigasyonu', 'Bee Navigation', 'Arılar güneşin konumunu ve polarize ışığı kullanarak hassas navigasyon yapar; GPS''siz 15 km uzağa gidip geri dönerler.', 'Bees navigate precisely using the sun''s position and polarized light; they travel 15 km away and return without GPS.', 'nature', '🐝', 7),
        ('Gökyüzünün Rengi', 'Sky Color', 'Ay''dan bakıldığında gökyüzü siyahtır çünkü atmosfer yoktur. Dünya''daki mavi renk, havanın ışığı dağıtmasından kaynaklanır.', 'From the Moon, the sky is black because there is no atmosphere. Earth''s blue color comes from air scattering light.', 'space', '🌙', 8),
        ('Rüzgar Hızı', 'Wind Speed Record', 'Dünyadaki en hızlı rüzgar 1999''da Oklahoma''da ölçüldü: saatte 484 km. Bir F1 aracından daha hızlı!', 'The fastest wind on Earth was measured in Oklahoma in 1999: 484 km/h. Faster than an F1 car!', 'nature', '💨', 9),
        ('İnsan Beyni', 'Human Brain', 'Beyin, uykuda uyanıkken olduğundan daha aktiftir. Hayalleriniz, beyin aktivitesinin zirve noktasıdır.', 'The brain is more active during sleep than when awake. Your dreams are the brain''s peak activity.', 'science', '🧠', 10)
      ON CONFLICT DO NOTHING;
    `);

    // Chatbot Knowledge
    await client.query(`
      INSERT INTO chatbot_knowledge (topic, content, language)
      VALUES
        ('trafik kuralları', 'Türkiye''de şehir içi hız limiti 50 km/s, şehir dışı 90 km/s, otoyollarda 120 km/s''dir. Emniyet kemeri takmak zorunludur.', 'tr'),
        ('trafik ışıkları', 'Kırmızı ışıkta dur, sarı ışıkta dur (geçiş hazırlığı), yeşil ışıkta geç. Sarı ışık uyarı sinyalidir, hızlanmak için değil.', 'tr'),
        ('acil durum', 'Acil durumlarda 112''yi arayın. Trafik kazası için 155 (polis), yangın için 110 (itfaiye), yol yardım için 182.', 'tr'),
        ('park kuralları', 'Yaya geçidine 5m, kavşağa 10m, hidrant önüne ve engelli alanlarına park yasaktır. Çift sıra park da yasaktır.', 'tr'),
        ('sürüş güvenliği', 'Yorgunken veya alkollüyken araç kullanmayın. Her 2 saatte bir mola verin. Cep telefonu kullanmak yasaklanmıştır.', 'tr'),
        ('traffic rules', 'In Turkey, the speed limit is 50 km/h in cities, 90 km/h outside cities, and 120 km/h on motorways. Seat belts are mandatory.', 'en'),
        ('traffic lights', 'Stop on red, prepare to stop on yellow, go on green. Yellow means warning, not acceleration.', 'en'),
        ('emergency', 'For emergencies call 112. For traffic accidents 155 (police), fire 110, roadside assistance 182.', 'en'),
        ('uygulama nasıl çalışır', 'Bu uygulama GPS ile konumunuzu izler. Trafik ışığında durduğunuzda otomatik algılar ve yeşile dönme sayacını gösterir. Bu sürede oyun oynayabilir, bilgi kartları okuyabilirsiniz.', 'tr'),
        ('how app works', 'This app uses GPS to track your location. It automatically detects when you stop at a traffic light and shows a countdown to green. During this time you can play games or read info cards.', 'en')
      ON CONFLICT DO NOTHING;
    `);

    console.log('[Seed] Başarıyla tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Hata:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();
