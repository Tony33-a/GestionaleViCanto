const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/tables
 * @desc    Get all tables
 * @access  Private
 */
router.get('/', authenticate, tableController.getAllTables);

/**
 * @route   GET /api/tables/:id
 * @desc    Get table by ID (with current order)
 * @access  Private
 */
router.get('/:id', authenticate, tableController.getTableById);

/**
 * @route   PUT /api/tables/:id
 * @desc    Update table status
 * @access  Private
 */
router.put('/:id', authenticate, tableController.updateTable);

/**
 * @route   PUT /api/tables/:id/free
 * @desc    Free table (reset to free)
 * @access  Private
 */
router.put('/:id/free', authenticate, tableController.freeTable);

/**
 * @route   PUT /api/tables/:id/lock
 * @desc    Lock table for current user
 * @access  Private
 */
router.put('/:id/lock', authenticate, tableController.lockTable);

/**
 * @route   PUT /api/tables/:id/unlock
 * @desc    Unlock table
 * @access  Private
 */
router.put('/:id/unlock', authenticate, tableController.unlockTable);

module.exports = router;
