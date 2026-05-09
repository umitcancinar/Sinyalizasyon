/**
 * grokService.js
 *
 * Grok API (xAI) wrapper — RAG mimarisi ile chatbot yanıt üretimi.
 * API key ASLA frontend'e sızdırılmaz, sadece bu dosyadan kullanılır.
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

  try {
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
      timeout: 15000,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Grok API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Şu an cevap üretemiyorum. 🙏';
    return { reply, model: GROK_MODEL };
  } catch (err) {
    console.error('[Grok] API hatası:', err.message);
    // Fallback: basit yanıt
    const fallbacks = {
      tr: 'Şu an sunucuya ulaşamıyorum. Oyunlar bölümünü deneyebilirsiniz! 🎮',
      en: 'I cannot reach the server right now. Try the games section! 🎮',
    };
    return { reply: fallbacks[language] || fallbacks.tr, model: 'fallback' };
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
