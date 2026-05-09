const rateLimit = require('express-rate-limit');

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Çok fazla istek.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { chatbotLimiter, authLimiter, apiLimiter };
