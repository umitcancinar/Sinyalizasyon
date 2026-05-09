const dotenv = require('dotenv');
const path = require('path');
// .env dosyasının mutlak yolu - CWD'den bağımsız
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/traffic', require('./routes/traffic'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/games', require('./routes/games'));
app.use('/api/content', require('./routes/content'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Trafik Sinyalizasyon API', environment: process.env.NODE_ENV || 'development' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// Vercel'de serverless ortamda da initDatabase yapılıp middleware ile
// her istek öncesi DB bağlantısı kontrol edilir
let dbReady = false;
const dbInit = initDatabase().then(() => {
  dbReady = true;
  console.log('[Server] DB bağlantısı hazır.');
}).catch((err) => {
  console.error('[Server] DB bağlantı hatası:', err.message);
});

// DB durumunu kontrol eden middleware
app.use(async (req, res, next) => {
  if (!dbReady) {
    try {
      await dbInit;
    } catch (_) { }
  }
  next();
});

// Development modunda doğrudan dinle
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dbInit.then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] API ${PORT} portunda çalışıyor`);
      console.log(`[Server] Sağlık: http://localhost:${PORT}/api/health`);
    });
  }).catch((err) => {
    console.error('[Server] Başlatma hatası:', err.message);
    app.listen(PORT, () => {
      console.log(`[Server] API ${PORT} portunda (DB hatası ile) çalışıyor`);
    });
  });
}

// Vercel deployment: export the app
module.exports = app;
