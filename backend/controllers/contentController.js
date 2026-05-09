const { pool } = require('../config/database');

async function getContacts(req, res) {
  try {
    const result = await pool.query('SELECT * FROM quick_contacts ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Kişiler alınamadı.' });
  }
}

async function getTemplates(req, res) {
  try {
    const result = await pool.query('SELECT * FROM message_templates ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Şablonlar alınamadı.' });
  }
}

async function getInfoCards(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM info_cards WHERE is_active=TRUE ORDER BY sort_order'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Bilgi kartları alınamadı.' });
  }
}

module.exports = { getContacts, getTemplates, getInfoCards };
