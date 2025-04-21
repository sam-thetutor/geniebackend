const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const routeController = require('../controllers/routeController');


router.post('/', [
  check('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  check('platform')
    .notEmpty()
    .withMessage('Platform is required')
    .isIn(['telegram', 'discord'])
    .withMessage('Invalid platform'),
  check('sourceId')
    .notEmpty()
    .withMessage('Source ID is required')
    .trim(),
  check('openchatApiKey')
    .notEmpty()
    .withMessage('OpenChat API key is required')
    .trim(),
  check('principal')
    .notEmpty()
    .withMessage('Principal is required')
], routeController.createRoute);

router.get('/', routeController.getRoutes);
router.put('/:id', routeController.updateRoute);
router.delete('/:id', routeController.deleteRoute);

module.exports = router; 