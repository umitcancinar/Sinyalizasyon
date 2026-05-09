const express = require('express');
const router = express.Router();
const { getScores, saveScore } = require('../controllers/gamesController');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.get('/scores', apiLimiter, getScores);
router.post('/score', authenticateToken, saveScore);

module.exports = router;
