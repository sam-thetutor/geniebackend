const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/generate-content', aiController.generateContent);
router.post('/analyze', aiController.analyzeContent);

module.exports = router; 