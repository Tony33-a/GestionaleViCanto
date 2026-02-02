const express = require('express');
const router = express.Router();
const db = require('../services/database');

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Database health check
router.get('/health/db', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'OK',
      service: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'FAIL',
      service: 'database',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.IO health check
router.get('/health/socketio', (req, res) => {
  const io = req.app.get('io');

  if (io && io.engine && io.engine.clientsCount !== undefined) {
    res.json({
      status: 'OK',
      service: 'socketio',
      clients: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'FAIL',
      service: 'socketio',
      error: 'Socket.IO not initialized',
      timestamp: new Date().toISOString()
    });
  }
});

// Complete health check (all services)
router.get('/health/all', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check Database
  try {
    await db.raw('SELECT 1');
    health.services.database = { status: 'OK' };
  } catch (error) {
    health.status = 'DEGRADED';
    health.services.database = { status: 'FAIL', error: error.message };
  }

  // Check Socket.IO
  const io = req.app.get('io');
  if (io && io.engine && io.engine.clientsCount !== undefined) {
    health.services.socketio = {
      status: 'OK',
      clients: io.engine.clientsCount
    };
  } else {
    health.status = 'DEGRADED';
    health.services.socketio = { status: 'FAIL' };
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes - Vicanto POS Gelateria
router.use('/auth', require('./auth'));
router.use('/tables', require('./tables'));
router.use('/tables', require('./tableLocks')); // Lock management
router.use('/tables', require('./tableFlows')); // Flow management
router.use('/menu', require('./menu'));
router.use('/orders', require('./orders'));
router.use('/reports', require('./reports')); // Dashboard e report admin
router.use('/users', require('./users')); // Gestione utenti/camerieri
router.use('/product-supplements', require('./productSupplements')); // Associazioni prodotto-supplemento
router.use('/printer', require('./printer')); // Diagnostica stampante

module.exports = router;
