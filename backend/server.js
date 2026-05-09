require('dotenv').config();
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
  res.json({ status: 'ok', service: 'Trafik Sinyalizasyon API', environment: 'production' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// Vercel deployment: export the app instead of calling listen
module.exports = app;
