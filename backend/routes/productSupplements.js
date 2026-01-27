const express = require('express');
const router = express.Router();
const productSupplementController = require('../controllers/productSupplementController');
const { authenticate, requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/product-supplements
 * @desc    Get all product-supplement associations
 * @access  Private
 */
router.get('/', authenticate, productSupplementController.getAllAssociations);

/**
 * @route   GET /api/products/:productId/supplements
 * @desc    Get all supplements for a product
 * @access  Private
 */
router.get('/products/:productId/supplements', authenticate, productSupplementController.getSupplementsForProduct);

/**
 * @route   GET /api/supplements/:supplementId/products
 * @desc    Get all products for a supplement
 * @access  Private
 */
router.get('/supplements/:supplementId/products', authenticate, productSupplementController.getProductsForSupplement);

/**
 * @route   POST /api/products/:productId/supplements/:supplementId
 * @desc    Add supplement to product
 * @access  Private (Admin only)
 */
router.post('/products/:productId/supplements/:supplementId', authenticate, requireAdmin, productSupplementController.addSupplementToProduct);

/**
 * @route   DELETE /api/products/:productId/supplements/:supplementId
 * @desc    Remove supplement from product
 * @access  Private (Admin only)
 */
router.delete('/products/:productId/supplements/:supplementId', authenticate, requireAdmin, productSupplementController.removeSupplementFromProduct);

/**
 * @route   PUT /api/supplements/:supplementId/products
 * @desc    Set all products for a supplement (replace existing)
 * @access  Private (Admin only)
 */
router.put('/supplements/:supplementId/products', authenticate, requireAdmin, productSupplementController.setProductsForSupplement);

module.exports = router;
