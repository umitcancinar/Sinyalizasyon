const express = require('express');
const router = express.Router();
const { getContacts, getTemplates, getInfoCards } = require('../controllers/contentController');
const { apiLimiter } = require('../middleware/rateLimiter');

router.get('/contacts', apiLimiter, getContacts);
router.get('/templates', apiLimiter, getTemplates);
router.get('/cards', apiLimiter, getInfoCards);

module.exports = router;
