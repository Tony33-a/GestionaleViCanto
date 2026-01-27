const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const tableFlowController = require('../controllers/tableFlowController');
const { authenticate } = require('../middleware/auth');
const {
  checkTableFlow,
  checkOpenTableFlow,
  checkAddItemsFlow,
  checkSendOrderFlow,
  checkCancelOrderFlow,
  checkFreeTableFlow
} = require('../middleware/tableFlow');
const validateOrderItems = require('../middleware/validateOrderItems');

// Rate limiter per operazioni flussi
const flowLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // max 50 richieste per IP per minuto
  message: {
    success: false,
    error: 'Troppe richieste, riprova tra 1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/tables/open
 * @desc    Apri tavolo (LIBERO → IN ATTESA)
 * @access  Private
 */
router.post('/open', 
  flowLimiter, 
  authenticate, 
  checkTableFlow, 
  checkOpenTableFlow, 
  tableFlowController.openTable
);

/**
 * @route   PUT /api/tables/:table_id/items
 * @desc    Aggiungi prodotti a tavolo (IN ATTESA/OCCUPATO)
 * @access  Private
 */
router.put('/:table_id/items', 
  flowLimiter, 
  authenticate, 
  checkTableFlow, 
  checkAddItemsFlow,
  validateOrderItems, 
  tableFlowController.addItemsToTable
);

/**
 * @route   PUT /api/tables/:table_id/send-order
 * @desc    Invia comanda (IN ATTESA/OCCUPATO con nuovi prodotti)
 * @access  Private
 */
router.put('/:table_id/send-order', 
  flowLimiter, 
  authenticate, 
  tableFlowController.sendOrderFromTable
);

/**
 * @route   DELETE /api/tables/:table_id/cancel-order
 * @desc    Annulla comanda (IN ATTESA → LIBERO)
 * @access  Private
 */
router.delete('/:table_id/cancel-order', 
  flowLimiter, 
  authenticate, 
  checkTableFlow, 
  checkCancelOrderFlow, 
  tableFlowController.cancelOrderFromTable
);

/**
 * @route   POST /api/tables/:table_id/free
 * @desc    Libera tavolo e stampa preconto (OCCUPATO → LIBERO)
 * @access  Private
 */
router.post('/:table_id/free', 
  flowLimiter, 
  authenticate, 
  checkTableFlow, 
  checkFreeTableFlow, 
  tableFlowController.freeTable
);

module.exports = router;
