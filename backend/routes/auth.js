const express = require('express');
const router = express.Router();
const { register, login, me, updatePreferences } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticateToken, me);
router.put('/preferences', authenticateToken, updatePreferences);

module.exports = router;
