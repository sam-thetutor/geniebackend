const express = require('express');
const router = express.Router();
const { check, query } = require('express-validator');
const contentController = require('../controllers/contentController');

// Create content
router.post('/', [
  check('campaignId')
    .notEmpty()
    .withMessage('Campaign ID is required')
    .isMongoId()
    .withMessage('Invalid campaign ID'),
  check('content')
    .notEmpty()
    .withMessage('Content is required')
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  check('scheduledTime')
    .notEmpty()
    .withMessage('Scheduled time is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
], contentController.createContent);

// Get contents for a campaign
router.get('/', [
  query('campaignId')
    .notEmpty()
    .withMessage('Campaign ID is required')
    .isMongoId()
    .withMessage('Invalid campaign ID'),
], contentController.getContents);

// Update content
router.put('/:id', [
  check('content')
    .optional()
    .isString()
    .withMessage('Content must be a string')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters'),
  check('scheduledTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
  check('status')
    .optional()
    .isIn(['pending', 'posted', 'failed'])
    .withMessage('Invalid status'),
], contentController.updateContent);

// Delete content
router.delete('/:id', contentController.deleteContent);

module.exports = router; 