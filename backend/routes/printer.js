/**
 * Printer Routes - API per diagnostica e gestione stampante
 */

const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printerController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Tutte le route richiedono autenticazione admin
router.use(authenticate);
router.use(requireAdmin);

// GET /api/printer/status - Stato stampante e coda
router.get('/status', printerController.getStatus);

// GET /api/printer/queue - Coda stampe dettagliata
router.get('/queue', printerController.getQueue);

// POST /api/printer/test - Stampa di test
router.post('/test', printerController.testPrint);

// POST /api/printer/retry/:jobId - Riprova stampa fallita
router.post('/retry/:jobId', printerController.retryJob);

// DELETE /api/printer/queue/:jobId - Cancella job dalla coda
router.delete('/queue/:jobId', printerController.deleteJob);

// POST /api/printer/clear-failed - Pulisci tutti i job falliti
router.post('/clear-failed', printerController.clearFailed);

module.exports = router;
