const db = require('../services/database');

/**
 * Model: Product
 * Gestisce i prodotti del menu (es. Cono piccolo, Brioche, Cappuccino)
 */
class Product {
  static tableName = 'products';

  /**
   * Trova tutti i prodotti disponibili
   * @returns {Promise<Array>}
   */
  static async findAll() {
    return db(this.tableName)
      .select('*')
      .where({ is_available: true })
      .orderBy(['category_code', 'display_order']);
  }

  /**
   * Trova prodotti per categoria
   * @param {string} categoryCode
   * @returns {Promise<Array>}
   */
  static async findByCategory(categoryCode) {
    return db(this.tableName)
      .select('*')
      .where({ category_code: categoryCode, is_available: true })
      .orderBy('display_order', 'asc');
  }

  /**
   * Trova prodotto per ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return db(this.tableName)
      .where({ id })
      .first();
  }

  /**
   * Trova prodotto per code
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  static async findByCode(code) {
    return db(this.tableName)
      .where({ code })
      .first();
  }

  /**
   * Crea nuovo prodotto
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  static async create(productData) {
    const [product] = await db(this.tableName)
      .insert({
        ...productData,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');

    return product;
  }

  /**
   * Aggiorna prodotto
   * @param {number} id
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  static async update(id, productData) {
    const [product] = await db(this.tableName)
      .where({ id })
      .update({
        ...productData,
        updated_at: db.fn.now()
      })
      .returning('*');

    return product;
  }

  /**
   * Disattiva prodotto
   * @param {number} id
   * @returns {Promise<Object>}
   */
  static async deactivate(id) {
    return this.update(id, { is_available: false });
  }
}

module.exports = Product;
