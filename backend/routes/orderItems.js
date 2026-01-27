const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const orderItemController = require('../controllers/orderItemController');
const { authenticate } = require('../middleware/auth');
const validateOrderItems = require('../middleware/validateOrderItems');

// Rate limiter per aggiunta items
const itemsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // max 100 richieste per IP per minuto
  message: {
    success: false,
    error: 'Troppe richieste, riprova tra 1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   PUT /api/orders/:id/items
 * @desc    Add items to existing order
 * @access  Private
 */
router.put('/:id/items', itemsLimiter, authenticate, validateOrderItems, orderItemController.addItemsToOrder);

module.exports = router;
