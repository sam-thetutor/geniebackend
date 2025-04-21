const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const campaignController = require('../controllers/campaignController');

router.post('/', [
  check('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  check('apiKey')
    .notEmpty()
    .withMessage('API key is required')
    .isString()
    .withMessage('API key must be a string')
    .trim(), 
  check('principal')
    .notEmpty()
    .withMessage('Principal is required'),
  check('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  check('endDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Invalid end date format')
], campaignController.createCampaign);

router.get('/', campaignController.getCampaigns);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router; 