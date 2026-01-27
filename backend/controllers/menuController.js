const MenuCategory = require('../models/MenuCategory');
const Product = require('../models/Product');
const Flavor = require('../models/Flavor');
const Supplement = require('../models/Supplement');

/**
 * Get all menu categories
 * GET /api/menu/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await MenuCategory.findAll();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 * POST /api/menu/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const category = await MenuCategory.create(req.body);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/menu/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await MenuCategory.update(id, req.body);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoria non trovata'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * DELETE /api/menu/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await MenuCategory.deactivate(id);

    res.json({
      success: true,
      message: 'Categoria eliminata con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by code with flavors
 * GET /api/menu/categories/:code
 */
const getCategoryByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const category = await MenuCategory.findByCodeWithFlavors(code);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Categoria non trovata'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all products
 * GET /api/menu/products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll();

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product
 * POST /api/menu/products
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * PUT /api/menu/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.update(id, req.body);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Prodotto non trovato'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 * DELETE /api/menu/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Product.deactivate(id);

    res.json({
      success: true,
      message: 'Prodotto eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get flavors by category
 * GET /api/menu/flavors/:categoryCode
 */
const getFlavorsByCategory = async (req, res, next) => {
  try {
    const { categoryCode } = req.params;
    const flavors = await Flavor.findByCategory(categoryCode);

    res.json({
      success: true,
      count: flavors.length,
      data: flavors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all flavors
 * GET /api/menu/flavors
 */
const getAllFlavors = async (req, res, next) => {
  try {
    const flavors = await Flavor.findAll();

    res.json({
      success: true,
      count: flavors.length,
      data: flavors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new flavor
 * POST /api/menu/flavors
 */
const createFlavor = async (req, res, next) => {
  try {
    const flavor = await Flavor.create(req.body);

    res.status(201).json({
      success: true,
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update flavor
 * PUT /api/menu/flavors/:id
 */
const updateFlavor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const flavor = await Flavor.update(id, req.body);

    if (!flavor) {
      return res.status(404).json({
        success: false,
        error: 'Gusto non trovato'
      });
    }

    res.json({
      success: true,
      data: flavor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete flavor
 * DELETE /api/menu/flavors/:id
 */
const deleteFlavor = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Flavor.deactivate(id);

    res.json({
      success: true,
      message: 'Gusto eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all supplements
 * GET /api/menu/supplements
 */
const getSupplements = async (req, res, next) => {
  try {
    const supplements = await Supplement.findAll();

    res.json({
      success: true,
      count: supplements.length,
      data: supplements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new supplement
 * POST /api/menu/supplements
 */
const createSupplement = async (req, res, next) => {
  try {
    const supplement = await Supplement.create(req.body);

    res.status(201).json({
      success: true,
      data: supplement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update supplement
 * PUT /api/menu/supplements/:id
 */
const updateSupplement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supplement = await Supplement.update(id, req.body);

    if (!supplement) {
      return res.status(404).json({
        success: false,
        error: 'Supplemento non trovato'
      });
    }

    res.json({
      success: true,
      data: supplement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete supplement
 * DELETE /api/menu/supplements/:id
 */
const deleteSupplement = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Supplement.setUnavailable(id);

    res.json({
      success: true,
      message: 'Supplemento eliminato con successo'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category
 * GET /api/menu/products/:categoryCode
 */
const getProductsByCategory = async (req, res, next) => {
  try {
    const { categoryCode } = req.params;
    const products = await Product.findByCategory(categoryCode);

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full menu (categories with products, flavors + supplements)
 * GET /api/menu/full
 */
const getFullMenu = async (req, res, next) => {
  try {
    const categories = await MenuCategory.findAll();
    const products = await Product.findAll();
    const flavors = await Flavor.findAll();
    const supplements = await Supplement.findAll();

    // Raggruppa prodotti e gusti per categoria
    const categoriesWithProducts = categories.map(cat => ({
      ...cat,
      products: products.filter(p => p.category_code === cat.code),
      flavors: flavors.filter(f => f.category_code === cat.code)
    }));

    res.json({
      success: true,
      data: {
        categories: categoriesWithProducts,
        supplements
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryByCode,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFlavorsByCategory,
  getAllFlavors,
  createFlavor,
  updateFlavor,
  deleteFlavor,
  getSupplements,
  createSupplement,
  updateSupplement,
  deleteSupplement,
  getFullMenu
};
