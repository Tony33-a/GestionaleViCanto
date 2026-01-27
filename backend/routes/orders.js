const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/orderController');
const orderItemController = require('../controllers/orderItemController');
const { authenticate } = require('../middleware/auth');
const validateOrderItems = require('../middleware/validateOrderItems');

// Rate limiter per creazione ordini
const orderCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // max 50 richieste per IP per minuto
  message: {
    success: false,
    error: 'Troppe richieste, riprova tra 1 minuto'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Rate limiter generale per tutte le altre operazioni
const generalLimiter = rateLimit({
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
 * @route   GET /api/orders/active
 * @desc    Get active orders (pending or sent)
 * @access  Private
 */
router.get('/active', generalLimiter, authenticate, orderController.getActiveOrders);

/**
 * @route   GET /api/orders
 * @desc    Get all orders (with filters)
 * @access  Private
 */
router.get('/', generalLimiter, authenticate, orderController.getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID (with items)
 * @access  Private
 */
router.get('/:id', generalLimiter, authenticate, orderController.getOrderById);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', (req, res, next) => {
  console.log('🔍 [ROUTE] POST /api/orders - richiesta ricevuta');
  console.log('🔍 [ROUTE] POST /api/orders - req.body:', req.body);
  next();
}, orderCreationLimiter, (req, res, next) => {
  console.log('🔍 [RATE LIMITER] orderCreationLimiter - passato');
  next();
}, authenticate, (req, res, next) => {
  console.log('🔍 [AUTH] authenticate - passato');
  next();
}, validateOrderItems, (req, res, next) => {
  console.log('🔍 [VALIDATE] validateOrderItems - passato');
  next();
}, orderController.createOrder);

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order (items, covers) - only pending orders
 * @access  Private
 */
router.put('/:id', generalLimiter, authenticate, orderController.updateOrder);

/**
 * @route   PUT /api/orders/:id/send
 * @desc    Send order (change to sent + print queue)
 * @access  Private
 */
router.put('/:id/send', orderCreationLimiter, authenticate, orderController.sendOrder);

/**
 * @route   PUT /api/orders/:id/complete
 * @desc    Complete order (free table)
 * @access  Private
 */
router.put('/:id/complete', generalLimiter, authenticate, orderController.completeOrder);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.put('/:id/cancel', generalLimiter, authenticate, orderController.cancelOrder);

/**
 * @route   PUT /api/orders/:id/items
 * @desc    Add items to existing order
 * @access  Private
 */
router.put('/:id/items', generalLimiter, authenticate, validateOrderItems, orderItemController.addItemsToOrder);

/**
 * @route   PUT /api/orders/:id/send-with-items
 * @desc    Add items and send order in one step
 * @access  Private
 */
router.put('/:id/send-with-items', generalLimiter, authenticate, validateOrderItems, orderItemController.sendOrderWithItems);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete order (hard delete)
 * @access  Private
 */
// router.delete('/:id', generalLimiter, authenticate, orderController.deleteOrder);

module.exports = router;
