const grokService = require('../services/grokService');

async function query(req, res) {
  const { message, language = 'tr', history = [] } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Mesaj boş olamaz.' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'Mesaj çok uzun (max 500 karakter).' });
  }
  try {
    const result = await grokService.generateResponse(message.trim(), language, history);
    res.json(result);
  } catch (err) {
    console.error('[Chatbot] Query hatası:', err.message);
    res.status(500).json({ error: 'Chatbot yanıt üretemedi.' });
  }
}

module.exports = { query };
