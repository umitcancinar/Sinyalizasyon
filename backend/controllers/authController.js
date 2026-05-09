const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function register(req, res) {
  const { username, email, password, preferred_lang = 'tr', preferred_theme = 'light' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı, e-posta ve şifre zorunludur.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM signal_users WHERE email=$1 OR username=$2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO signal_users (username, email, password_hash, preferred_lang, preferred_theme)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, preferred_lang, preferred_theme`,
      [username, email, hash, preferred_lang, preferred_theme]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[Auth] Register hata:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM signal_users WHERE email=$1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        preferred_lang: user.preferred_lang,
        preferred_theme: user.preferred_theme
      }
    });
  } catch (err) {
    console.error('[Auth] Login hata:', err.message);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, email, preferred_lang, preferred_theme, created_at FROM signal_users WHERE id=$1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

async function updatePreferences(req, res) {
  const { preferred_lang, preferred_theme } = req.body;
  try {
    await pool.query(
      'UPDATE signal_users SET preferred_lang=$1, preferred_theme=$2 WHERE id=$3',
      [preferred_lang, preferred_theme, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
}

module.exports = { register, login, me, updatePreferences };
