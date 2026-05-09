const { pool } = require('../config/database');

// GET /api/games/scores?game_type=reflex
async function getScores(req, res) {
  const { game_type } = req.query;
  try {
    const result = await pool.query(
      `SELECT sgs.score, sgs.game_type, sgs.played_at, su.username
       FROM signal_game_scores sgs
       JOIN signal_users su ON sgs.user_id = su.id
       WHERE ($1::text IS NULL OR sgs.game_type = $1)
       ORDER BY sgs.score DESC
       LIMIT 20`,
      [game_type || null]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Skorlar alınamadı.' });
  }
}

// POST /api/games/score
async function saveScore(req, res) {
  const { game_type, score } = req.body;
  if (!game_type || score === undefined) {
    return res.status(400).json({ error: 'game_type ve score zorunlu.' });
  }
  try {
    await pool.query(
      'INSERT INTO signal_game_scores (user_id, game_type, score) VALUES ($1, $2, $3)',
      [req.user.id, game_type, score]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Skor kaydedilemedi.' });
  }
}

module.exports = { getScores, saveScore };
