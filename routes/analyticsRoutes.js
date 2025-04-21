const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/patterns/:userId', analyticsController.getUserPatterns);
router.get('/recommendations/:userId', analyticsController.getContentRecommendations);
router.get('/dashboard/:userId', analyticsController.getDashboardMetrics);

module.exports = router; 