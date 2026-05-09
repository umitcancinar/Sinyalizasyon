require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3002;

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://umitcancinar.me',
  'https://www.umitcancinar.me',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => o && origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS hatası: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Trafik Sinyalizasyon API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/traffic', require('./routes/traffic'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/games', require('./routes/games'));
app.use('/api/content', require('./routes/content'));

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Hata:', err.message);
  res.status(500).json({ error: 'Sunucu hatası.' });
});

// ── INIT ─────────────────────────────────────────────────────────────────────
initDatabase()
  .then(() => {
    console.log('[Server] Veritabanı hazır.');
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`[Server] http://localhost:${PORT} — Trafik Sinyalizasyon API`);
      });
    }
  })
  .catch(err => {
    console.error('[Server] Veritabanı başlatma hatası:', err.message);
    process.exit(1);
  });

module.exports = app;
