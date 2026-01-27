const db = require('../services/database');

/**
 * Get all supplements for a product
 * GET /api/products/:productId/supplements
 */
const getSupplementsForProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const supplements = await db('product_supplements')
      .join('supplements', 'product_supplements.supplement_id', 'supplements.id')
      .where('product_supplements.product_id', productId)
      .select('supplements.*');

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
 * Get all products for a supplement
 * GET /api/supplements/:supplementId/products
 */
const getProductsForSupplement = async (req, res, next) => {
  try {
    const { supplementId } = req.params;

    const products = await db('product_supplements')
      .join('products', 'product_supplements.product_id', 'products.id')
      .where('product_supplements.supplement_id', supplementId)
      .select('products.*');

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
 * Add supplement to product
 * POST /api/products/:productId/supplements/:supplementId
 */
const addSupplementToProduct = async (req, res, next) => {
  try {
    const { productId, supplementId } = req.params;

    // Check if association already exists
    const existing = await db('product_supplements')
      .where({ product_id: productId, supplement_id: supplementId })
      .first();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Associazione già esistente'
      });
    }

    await db('product_supplements').insert({
      product_id: productId,
      supplement_id: supplementId
    });

    res.status(201).json({
      success: true,
      message: 'Supplemento associato al prodotto'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove supplement from product
 * DELETE /api/products/:productId/supplements/:supplementId
 */
const removeSupplementFromProduct = async (req, res, next) => {
  try {
    const { productId, supplementId } = req.params;

    const deleted = await db('product_supplements')
      .where({ product_id: productId, supplement_id: supplementId })
      .del();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Associazione non trovata'
      });
    }

    res.json({
      success: true,
      message: 'Associazione rimossa'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set all products for a supplement (replace existing)
 * PUT /api/supplements/:supplementId/products
 * Body: { productIds: [1, 2, 3] }
 */
const setProductsForSupplement = async (req, res, next) => {
  try {
    const { supplementId } = req.params;
    const { productIds } = req.body;

    if (!Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        error: 'productIds deve essere un array'
      });
    }

    // Start transaction
    await db.transaction(async (trx) => {
      // Remove all existing associations for this supplement
      await trx('product_supplements')
        .where('supplement_id', supplementId)
        .del();

      // Add new associations
      if (productIds.length > 0) {
        const associations = productIds.map(productId => ({
          product_id: productId,
          supplement_id: parseInt(supplementId)
        }));
        await trx('product_supplements').insert(associations);
      }
    });

    res.json({
      success: true,
      message: `${productIds.length} prodotti associati al supplemento`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all product-supplement associations
 * GET /api/product-supplements
 */
const getAllAssociations = async (req, res, next) => {
  try {
    const associations = await db('product_supplements')
      .select('*');

    res.json({
      success: true,
      count: associations.length,
      data: associations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSupplementsForProduct,
  getProductsForSupplement,
  addSupplementToProduct,
  removeSupplementFromProduct,
  setProductsForSupplement,
  getAllAssociations
};
