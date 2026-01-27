const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    Get all active users (waiters)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { username, pin, role } = req.body;
    
    if (!username || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Username e PIN sono obbligatori'
      });
    }

    // Verifica che il PIN sia di 4 cifre
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: 'Il PIN deve essere di 4 cifre'
      });
    }

    const user = await User.create({ username, pin, role: role || 'waiter' });
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        error: 'Username già esistente'
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, pin, role, is_active } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (pin) updateData.pin = pin;
    if (role) updateData.role = role;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const user = await User.update(id, updateData);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.deactivate(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utente non trovato'
      });
    }

    res.json({
      success: true,
      message: 'Utente disattivato'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
