/**
 * grokService.js
 *
 * Grok API (xAI) wrapper — RAG mimarisi ile chatbot yanıt üretimi.
 * API key ASLA frontend'e sızdırılmaz, sadece bu dosyadan kullanılır.
 *
 * Grok API erişilemezse akıllı offline fallback yanıtları üretir.
 */

const fetch = require('node-fetch');
const { pool } = require('../config/database');

const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

const SYSTEM_PROMPT = `Sen "Sinyalizasyon" uygulamasının asistanısın. Adın Sinyal. Kullanıcılar trafik ışığında beklerken seninle konuşuyor.

Görevlerin:
- Trafik güvenliği, yol kuralları, sürüş ipuçları hakkında bilgi ver
- Uygulamanın özelliklerini (oyunlar, bilgi kartları, hızlı arama) tanıt
- Kullanıcıyı oyunları denemek için teşvik et
- Türkçe veya İngilizce konuş (kullanıcı hangi dili kullanıyorsa o dili kullan)
- Kısa, samimi ve bilgilendirici cevaplar ver (3-5 cümle ideal)
- Emojilerle canlandır 🚦

ASLA yapma:
- Sürüş sırasında tehlikeli öneriler verme
- Kişisel verileri sormak veya saklamak
- Politika, din veya hassas konularda görüş bildirme`;

// ── OFFLINE AKILLI YANIT SİSTEMİ ──────────────────────────────
const OFFLINE_RESPONSES = {
  tr: {
    greetings: [
      'Merhaba! 🚦 Ben Sinyal, trafik asistanın. Trafik kuralları, güvenlik ipuçları veya uygulamanın özellikleri hakkında sorularını yanıtlayabilirim!',
      'Selam! 😊 Trafik ışığında beklerken sana yardımcı olabilirim. Oyunlarımızı denedin mi? Sol menüden 3 farklı mini oyun oynayabilirsin!',
      'Hoş geldin! 🚗 Sinyalizasyon\'un AI asistanı olarak buradayım. Bana trafik hakkında ne sormak istersen sor!'
    ],
    traffic_rules: [
      'Kırmızı ışıkta mutlaka durun! 🔴 Takip mesafesi şehir içinde en az 2 saniye, şehir dışında en az 4 saniye olmalıdır. Yağmurlu havalarda bu süreyi ikiye katlayın.',
      'Emniyet kemeri takma zorunluluğu hem ön hem arka koltuk için geçerlidir. Takmamak hem can güvenliğinizi riskli hale getirir hem de ceza almanıza yol açar! 🚗',
      'Sarı ışık "hazırlan" değil, "dur" anlamına gelir! 🟡 Kavşağa girmişseniz geçebilirsiniz ama henüz girmediyseniz durmanız gerekir.',
      'Okul bölgelerinde hız sınırı 30 km/s\'dir. Çocuklar beklenmedik hareketler yapabilir, ekstra dikkatli olun! 🏫'
    ],
    app_features: [
      'Sinyalizasyon uygulamasında 3 harika özellik var: 🎮 Mini Oyunlar (hafıza, refleks, kelime bulmaca), 💡 Bilgi Kartları (ilginç bilgiler) ve 📞 Hızlı Arama (acil numaralar). Hepsini menüden keşfedebilirsin!',
      'Uygulamamız GPS ile durduğunu otomatik algılıyor ve en yakın trafik ışığını bularak yeşile kalan süreyi gösteriyor. Bu sürede oyun oynayabilir, bilgi kartlarını okuyabilirsin! 🚦',
      'Acil bir durumda mı kaldın? Hızlı Arama özelliğimizle 112, 155, 110 gibi acil numaralara tek dokunuşla ulaşabilirsin! 📞'
    ],
    games: [
      'Oyunlar bölümünde 3 farklı oyun seni bekliyor! 🎮\n\n🧠 Hafıza Eşleştirme: Kartları çevir ve eşlerini bul\n⚡ Refleks Testi: Yeşil ışıkta ne kadar hızlı tepki verirsin?\n📝 Kelime Bulmaca: Trafik terimlerini tahmin et\n\nHepsinin skor tablosu var, en iyi skoru yapmaya çalış!',
      'Mini oyunlarımız trafik ışığında bekleme sürenizi eğlenceli hale getirmek için tasarlandı! Sol menüden "Oyunlar" butonuna tıklayarak hemen başlayabilirsin. 🎮'
    ],
    emergency: [
      'Acil durumlar için önemli numaralar:\n🚑 112 - Acil Yardım\n🚔 155 - Polis İmdat\n🚒 110 - İtfaiye\n📞 182 - Alo Trafik\n\nHızlı Arama özelliğimizle tek dokunuşla arayabilirsin!',
      'Trafik kazası durumunda: 1) Güvenli bir yere çekilin 2) 112\'yi arayın 3) Yaralılara ilk yardım yapın 4) Kaza yerini fotoğraflayın 5) Tutanak tutun. Sakin kalın! 🆘'
    ],
    default: [
      'İlginç bir soru! 🤔 Ben trafik güvenliği, uygulama özellikleri ve acil durumlar konusunda yardımcı olabilirim. Başka bir şey sormak ister misin?',
      'Bu konuda elimde detaylı bilgi yok ama trafik kuralları, oyunlar veya acil numaralar hakkında sorular sorabilirsin! 🚦',
      'Hmm, bunu tam olarak bilmiyorum. Ama sana trafik güvenliği ipuçları verebilir veya uygulama özelliklerini tanıtabilirim! Oyunları denedin mi? 🎮'
    ]
  },
  en: {
    greetings: [
      'Hello! 🚦 I\'m Sinyal, your traffic assistant. I can answer questions about traffic rules, safety tips, or app features!',
      'Hi there! 😊 I can help you while waiting at the traffic light. Have you tried our games? You can play 3 different mini games from the menu!',
      'Welcome! 🚗 I\'m here as Sinyalizasyon\'s AI assistant. Ask me anything about traffic!'
    ],
    traffic_rules: [
      'Always stop at red lights! 🔴 Safe following distance should be at least 2 seconds in urban areas and 4 seconds on highways. Double this in rainy conditions.',
      'Seat belts are mandatory for both front and rear passengers. Not wearing one risks your safety and results in fines! 🚗',
      'Yellow light means "stop", not "speed up"! 🟡 If you\'ve already entered the intersection, you can pass. Otherwise, you must stop.'
    ],
    app_features: [
      'Sinyalizasyon has 3 amazing features: 🎮 Mini Games (memory, reflex, word puzzle), 💡 Info Cards (fun facts), and 📞 Quick Call (emergency numbers). Discover them all from the menu!',
      'Our app automatically detects when you stop using GPS and finds the nearest traffic light, showing countdown to green. During this time, you can play games or read info cards! 🚦'
    ],
    games: [
      '3 games await you! 🎮\n\n🧠 Memory Match: Flip cards and find pairs\n⚡ Reflex Test: How fast can you react to green?\n📝 Word Puzzle: Guess traffic terms\n\nAll have leaderboards - try to get the best score!'
    ],
    emergency: [
      'Emergency numbers:\n🚑 112 - Emergency\n🚔 155 - Police\n🚒 110 - Fire Department\n📞 182 - Traffic Hotline\n\nUse our Quick Call feature for one-tap dialing!'
    ],
    default: [
      'Interesting question! 🤔 I can help with traffic safety, app features, and emergencies. Want to ask something else?',
      'I don\'t have detailed info on that, but I can answer questions about traffic rules, games, or emergency numbers! 🚦'
    ]
  }
};

// Anahtar kelime eşleştirme ile kategori belirleme
const KEYWORD_MAP = {
  greetings: ['merhaba', 'selam', 'hello', 'hi', 'hey', 'naber', 'nasılsın', 'meraba'],
  traffic_rules: ['kural', 'trafik', 'hız', 'kırmızı', 'yeşil', 'sarı', 'ışık', 'kemer', 'ceza', 'rule', 'speed', 'light', 'belt', 'takip', 'mesafe', 'distance'],
  app_features: ['uygulama', 'özellik', 'ne yapabilir', 'nasıl', 'feature', 'app', 'what can', 'how'],
  games: ['oyun', 'game', 'hafıza', 'refleks', 'kelime', 'memory', 'reflex', 'word', 'oyna', 'play', 'skor', 'score'],
  emergency: ['acil', 'emergency', '112', '155', '110', 'polis', 'ambulans', 'itfaiye', 'kaza', 'accident', 'yardım', 'help', 'ara', 'call']
};

function getOfflineCategory(message) {
  const lower = message.toLowerCase();
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return 'default';
}

function getOfflineResponse(message, language) {
  const lang = OFFLINE_RESPONSES[language] ? language : 'tr';
  const category = getOfflineCategory(message);
  const responses = OFFLINE_RESPONSES[lang][category] || OFFLINE_RESPONSES[lang].default;
  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Kullanıcı sorusuna yanıt üret (RAG + Grok)
 */
async function generateResponse(userMessage, language = 'tr', conversationHistory = []) {
  // 1. RAG: İlgili bilgileri veritabanından çek
  const context = await retrieveContext(userMessage, language);

  // 2. Mesaj geçmişini hazırla (son 10 mesaj)
  const recentHistory = conversationHistory.slice(-10);

  // 3. Context varsa system mesajına ekle
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n--- İlgili Bilgiler ---\n${context}\n----------------------`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];

  // Grok API key kontrolü
  if (!process.env.GROK_API_KEY) {
    console.warn('[Grok] API key tanımlı değil, offline mod kullanılıyor.');
    return { reply: getOfflineResponse(userMessage, language), model: 'offline' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12 saniye timeout

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Grok] API ${response.status}: ${err}`);
      // 403/401 = kredi/yetki sorunu, 429 = rate limit, 5xx = sunucu hatası
      // Hepsinde offline fallback kullan
      return { reply: getOfflineResponse(userMessage, language), model: 'offline' };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || getOfflineResponse(userMessage, language);
    return { reply, model: GROK_MODEL };
  } catch (err) {
    console.error('[Grok] API hatası:', err.message);
    // Timeout, network hatası vs. — offline fallback
    return { reply: getOfflineResponse(userMessage, language), model: 'offline' };
  }
}

/**
 * RAG: Keyword eşleştirme ile chatbot_knowledge tablosundan ilgili içerik çek
 */
async function retrieveContext(query, language) {
  try {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return null;

    // Her kelime için arama yap
    const result = await pool.query(
      `SELECT content FROM chatbot_knowledge
       WHERE language = $1
         AND (${words.map((_, i) => `content ILIKE $${i + 2}`).join(' OR ')})
       LIMIT 3`,
      [language, ...words.map(w => `%${w}%`)]
    );

    if (result.rows.length === 0) {
      // Dil farketmeksizin ara
      const fallback = await pool.query(
        `SELECT content FROM chatbot_knowledge
         WHERE (${words.map((_, i) => `content ILIKE $${i + 1}`).join(' OR ')})
         LIMIT 2`,
        words.map(w => `%${w}%`)
      );
      return fallback.rows.map(r => r.content).join('\n');
    }

    return result.rows.map(r => r.content).join('\n');
  } catch (err) {
    console.error('[RAG] Context retrieval hatası:', err.message);
    return null;
  }
}

module.exports = { generateResponse };
