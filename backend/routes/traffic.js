const express = require('express');
const router = express.Router();
const { getNearbyLights, recordStop } = require('../controllers/trafficController');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

router.get('/nearby', apiLimiter, getNearbyLights);
router.post('/stop', authenticateToken, recordStop);

module.exports = router;
