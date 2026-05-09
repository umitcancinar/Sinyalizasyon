const express = require('express');
const router = express.Router();
const { query } = require('../controllers/chatbotController');
const { chatbotLimiter } = require('../middleware/rateLimiter');

router.post('/query', chatbotLimiter, query);

module.exports = router;
