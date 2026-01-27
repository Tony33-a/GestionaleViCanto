const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/menu/categories
 * @desc    Get all menu categories
 * @access  Private
 */
router.get('/categories', authenticate, menuController.getCategories);

/**
 * @route   POST /api/menu/categories
 * @desc    Create new category
 * @access  Private
 */
router.post('/categories', authenticate, menuController.createCategory);

/**
 * @route   PUT /api/menu/categories/:id
 * @desc    Update category
 * @access  Private
 */
router.put('/categories/:id', authenticate, menuController.updateCategory);

/**
 * @route   DELETE /api/menu/categories/:id
 * @desc    Delete category
 * @access  Private
 */
router.delete('/categories/:id', authenticate, menuController.deleteCategory);

/**
 * @route   GET /api/menu/categories/:code
 * @desc    Get category by code with flavors
 * @access  Private
 */
router.get('/categories/:code', authenticate, menuController.getCategoryByCode);

/**
 * @route   GET /api/menu/products
 * @desc    Get all products
 * @access  Private
 */
router.get('/products', authenticate, menuController.getAllProducts);

/**
 * @route   POST /api/menu/products
 * @desc    Create new product
 * @access  Private
 */
router.post('/products', authenticate, menuController.createProduct);

/**
 * @route   PUT /api/menu/products/:id
 * @desc    Update product
 * @access  Private
 */
router.put('/products/:id', authenticate, menuController.updateProduct);

/**
 * @route   DELETE /api/menu/products/:id
 * @desc    Delete product
 * @access  Private
 */
router.delete('/products/:id', authenticate, menuController.deleteProduct);

/**
 * @route   GET /api/menu/products/:categoryCode
 * @desc    Get products by category
 * @access  Private
 */
router.get('/products/:categoryCode', authenticate, menuController.getProductsByCategory);

/**
 * @route   GET /api/menu/flavors
 * @desc    Get all flavors
 * @access  Private
 */
router.get('/flavors', authenticate, menuController.getAllFlavors);

/**
 * @route   POST /api/menu/flavors
 * @desc    Create new flavor
 * @access  Private
 */
router.post('/flavors', authenticate, menuController.createFlavor);

/**
 * @route   PUT /api/menu/flavors/:id
 * @desc    Update flavor
 * @access  Private
 */
router.put('/flavors/:id', authenticate, menuController.updateFlavor);

/**
 * @route   DELETE /api/menu/flavors/:id
 * @desc    Delete flavor
 * @access  Private
 */
router.delete('/flavors/:id', authenticate, menuController.deleteFlavor);

/**
 * @route   GET /api/menu/flavors/:categoryCode
 * @desc    Get flavors by category
 * @access  Private
 */
router.get('/flavors/:categoryCode', authenticate, menuController.getFlavorsByCategory);

/**
 * @route   GET /api/menu/supplements
 * @desc    Get all supplements
 * @access  Private
 */
router.get('/supplements', authenticate, menuController.getSupplements);

/**
 * @route   POST /api/menu/supplements
 * @desc    Create new supplement
 * @access  Private
 */
router.post('/supplements', authenticate, menuController.createSupplement);

/**
 * @route   PUT /api/menu/supplements/:id
 * @desc    Update supplement
 * @access  Private
 */
router.put('/supplements/:id', authenticate, menuController.updateSupplement);

/**
 * @route   DELETE /api/menu/supplements/:id
 * @desc    Delete supplement
 * @access  Private
 */
router.delete('/supplements/:id', authenticate, menuController.deleteSupplement);

/**
 * @route   GET /api/menu/full
 * @desc    Get full menu (categories, flavors, supplements)
 * @access  Private
 */
router.get('/full', authenticate, menuController.getFullMenu);

module.exports = router;
