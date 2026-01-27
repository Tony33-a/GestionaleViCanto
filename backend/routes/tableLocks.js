const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const tableLockController = require('../controllers/tableLockController');
const { authenticate } = require('../middleware/auth');

// Rate limiter per operazioni lock (più restrittivo)
const lockLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // max 30 richieste per IP per minuto
  message: {
    success: false,
    error: 'Troppe richieste di lock, riprova tra 1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/tables/:id/lock
 * @desc    Blocca tavolo per utente (lock concorrente)
 * @access  Private
 */
router.post('/:id/lock', lockLimiter, authenticate, tableLockController.lockTable);

/**
 * @route   POST /api/tables/:id/unlock
 * @desc    Sblocca tavolo
 * @access  Private
 */
router.post('/:id/unlock', lockLimiter, authenticate, tableLockController.unlockTable);

/**
 * @route   GET /api/tables/:id/lock-status
 * @desc    Verifica stato lock tavolo
 * @access  Private
 */
router.get('/:id/lock-status', authenticate, tableLockController.getLockStatus);

/**
 * @route   POST /api/tables/cleanup-locks
 * @desc    Pulisci lock expired (solo admin)
 * @access  Private (Admin only)
 */
router.post('/cleanup-locks', authenticate, tableLockController.cleanupExpiredLocks);

module.exports = router;
