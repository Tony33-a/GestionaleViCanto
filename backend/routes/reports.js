const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/reports/dashboard
 * @desc    Dashboard generale con statistiche
 * @access  Private (Admin only)
 */
router.get('/dashboard', authenticate, requireAdmin, reportController.getDashboard);

/**
 * @route   GET /api/reports/orders
 * @desc    Storico ordini con filtri
 * @access  Private (Admin only)
 */
router.get('/orders', authenticate, requireAdmin, reportController.getOrdersHistory);

/**
 * @route   GET /api/reports/daily
 * @desc    Report giornaliero
 * @access  Private (Admin only)
 */
router.get('/daily', authenticate, requireAdmin, reportController.getDailyReport);

/**
 * @route   GET /api/reports/weekly
 * @desc    Report settimanale
 * @access  Private (Admin only)
 */
router.get('/weekly', authenticate, requireAdmin, reportController.getWeeklyReport);

/**
 * @route   GET /api/reports/monthly
 * @desc    Report mensile
 * @access  Private (Admin only)
 */
router.get('/monthly', authenticate, requireAdmin, reportController.getMonthlyReport);

module.exports = router;
