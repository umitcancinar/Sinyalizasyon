/**
 * grokService.js
 *
 * Grok API (xAI) wrapper — RAG (Retrieval-Augmented Generation) Mimarisi.
 * Yapay zeka ile doğrudan .env üzerinden haberleşir, API key frontend'e gönderilmez.
 * RAG hataya karşı dayanıklıdır; DB çökse bile Grok API çalışmaya devam eder.
 * Grok API erişilemezse (örneğin kredi bittiğinde) akıllı offline fallback devreye girer.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
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
      'Merhaba! 🚦 Ben Sinyal, trafik asistanın. Trafik kuralları veya uygulama hakkında sorularını yanıtlayabilirim!',
      'Selam! 😊 Trafik ışığında beklerken sana yardımcı olabilirim. Oyunlarımızı denedin mi?'
    ],
    traffic_rules: [
      'Kırmızı ışıkta mutlaka durun! 🔴 Takip mesafesi şehir içinde en az 2 saniye olmalıdır.',
      'Emniyet kemeri takma zorunluluğu hem ön hem arka koltuk için geçerlidir! 🚗',
      'Sarı ışık "hazırlan" değil, "dur" anlamına gelir! 🟡'
    ],
    app_features: [
      'Sinyalizasyon uygulamasında 3 özellik var: 🎮 Oyunlar, 💡 Bilgi Kartları ve 📞 Hızlı Arama. Menüden keşfedebilirsin!'
    ],
    games: [
      'Oyunlar bölümünde 3 farklı oyun seni bekliyor! 🎮 Hafıza, Refleks ve Kelime oyunları ile vakit geçirebilirsin.'
    ],
    emergency: [
      'Acil durumlar için numaralar: 🚑 112 - Acil, 🚔 155 - Polis, 🚒 110 - İtfaiye. Hızlı Arama özelliğini kullanabilirsin!'
    ],
    default: [
      'İlginç bir soru! 🤔 Ben trafik güvenliği, uygulama özellikleri ve acil durumlar konusunda yardımcı olabilirim.',
      'Bu konuda elimde detaylı bilgi yok ama trafik kuralları veya oyunlar hakkında sorular sorabilirsin! 🚦'
    ]
  },
  en: {
    greetings: [
      'Hello! 🚦 I\'m Sinyal, your traffic assistant. I can answer questions about traffic rules or app features!',
      'Hi there! 😊 Have you tried our mini games from the menu?'
    ],
    traffic_rules: [
      'Always stop at red lights! 🔴 Safe following distance should be at least 2 seconds in urban areas.'
    ],
    app_features: [
      'Sinyalizasyon has 3 features: 🎮 Mini Games, 💡 Info Cards, and 📞 Quick Call.'
    ],
    games: [
      '3 games await you! 🎮 Memory Match, Reflex Test, and Word Puzzle.'
    ],
    emergency: [
      'Emergency numbers: 🚑 112 - Emergency, 🚔 155 - Police, 🚒 110 - Fire Dept.'
    ],
    default: [
      'Interesting question! 🤔 I can help with traffic safety, app features, and emergencies.',
      'I don\'t have detailed info on that, but I can answer questions about traffic rules or games! 🚦'
    ]
  }
};

const KEYWORD_MAP = {
  greetings: ['merhaba', 'selam', 'hello', 'hi', 'hey', 'naber', 'nasılsın', 'meraba'],
  traffic_rules: ['kural', 'trafik', 'hız', 'kırmızı', 'yeşil', 'sarı', 'ışık', 'kemer', 'ceza', 'rule', 'speed', 'light'],
  app_features: ['uygulama', 'özellik', 'nasıl', 'feature', 'app', 'how'],
  games: ['oyun', 'game', 'hafıza', 'refleks', 'kelime', 'memory', 'reflex', 'word', 'oyna', 'play'],
  emergency: ['acil', 'emergency', '112', '155', '110', 'polis', 'ambulans', 'kaza', 'yardım', 'ara', 'call']
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
 * ── YENİ RAG MİMARİSİ ──
 * RAG işlemi (Veritabanından bağlam çekme) tamamen izole edilmiştir.
 * Eğer veritabanı çökerse veya tablo yoksa, chatbot bunu yoksayar ve sadece system prompt ile Grok'a gider.
 */
async function retrieveContext(query, language) {
  if (!pool) return null; // DB bağlantısı yoksa RAG'ı atla

  try {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return null;

    // Timeout eklendi: RAG sorgusu 2 saniyeyi geçerse iptal et (Grok API'yi yavaşlatmasın)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RAG Timeout')), 2000));
    
    // Her kelime için OR sorgusu oluştur
    const conditions = words.map((_, i) => `content ILIKE $${i + 2}`).join(' OR ');
    const values = [language, ...words.map(w => `%${w}%`)];
    
    const dbQueryPromise = pool.query(
      `SELECT content FROM chatbot_knowledge WHERE language = $1 AND (${conditions}) LIMIT 3`,
      values
    );

    const result = await Promise.race([dbQueryPromise, timeoutPromise]);
    
    if (result.rows && result.rows.length > 0) {
      return result.rows.map(r => r.content).join('\n');
    }
    return null;
  } catch (err) {
    console.error('[RAG] Bağlam arama başarısız (Yok sayılıyor):', err.message);
    return null; // RAG hatası chatbotu durdurmasın!
  }
}

/**
 * ── GROK API İLETİŞİMİ ──
 * Kullanıcı sorusuna yanıt üretir.
 */
async function generateResponse(userMessage, language = 'tr', conversationHistory = []) {
  // 1. RAG ile bağlamı güvenli bir şekilde çek (Hata verirse null döner)
  const context = await retrieveContext(userMessage, language);

  // 2. Mesaj geçmişini hazırla
  const recentHistory = conversationHistory.slice(-10);

  // 3. System prompt'u bağlam (context) ile birleştir
  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n--- İlgili Bilgiler ---\n${context}\n----------------------`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];

  // 4. API Key kontrolü
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    console.warn('[Grok] GROK_API_KEY .env dosyasında bulunamadı. Offline mod devrede.');
    return { reply: getOfflineResponse(userMessage, language), model: 'offline' };
  }

  // 5. Grok API'ye istek at
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12 saniye timeout

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
      console.error(`[Grok] API Hatası (${response.status}): ${err}`);
      // 403 (Kredi bitti) veya 429 (Rate limit) durumunda kullanıcıya hatayı yansıtma, offline fallback kullan
      return { reply: getOfflineResponse(userMessage, language), model: 'offline-fallback' };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || getOfflineResponse(userMessage, language);
    return { reply, model: GROK_MODEL };
    
  } catch (err) {
    console.error('[Grok] Bağlantı Hatası:', err.message);
    // Timeout veya network kopması durumunda
    return { reply: getOfflineResponse(userMessage, language), model: 'offline-timeout' };
  }
}

module.exports = { generateResponse };
