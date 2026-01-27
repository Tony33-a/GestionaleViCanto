const db = require('../services/database');

/**
 * Model: Order
 * Gestisce gli ordini della gelateria
 * Stati: pending, sent, completed, cancelled
 */
const OrderCalculator = require('../services/orderCalculator');

class Order {
  static tableName = 'orders';

  /**
   * Trova tutti gli ordini con filtri
   * @param {Object} filters - { status, table_id, user_id }
   * @returns {Promise<Array>}
   */
  static async findAll(filters = {}) {
    let query = db(this.tableName)
      .select(
        'orders.*',
        'tables.number as table_number',
        'users.username as waiter_username'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('users', 'orders.user_id', 'users.id');

    if (filters.status) {
      query = query.where('orders.status', filters.status);
    }

    if (filters.table_id) {
      query = query.where('orders.table_id', filters.table_id);
    }

    if (filters.user_id) {
      query = query.where('orders.user_id', filters.user_id);
    }

    return query.orderBy('orders.created_at', 'desc');
  }

  /**
   * Trova ordine per ID con items (OTTIMIZZATO - json_agg PostgreSQL)
   * Usa json_agg per raggruppare items a livello di query
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object|null>}
   */
  static async findById(id, trx = null) {
    try {
      const dbContext = trx || db;

      // Prima query: ottieni l'ordine base
      let orderQuery = `SELECT 
        orders.*,
        tables.number as table_number,
        users.username as waiter_username
        FROM orders
        LEFT JOIN tables ON orders.table_id = tables.id
        LEFT JOIN users ON orders.user_id = users.id
        WHERE orders.id = ?`;
      
      let order;
      if (trx) {
        order = await trx.raw(orderQuery, [id]);
      } else {
        order = await db.raw(orderQuery, [id]);
      }
      
      if (!order || !order.rows || order.rows.length === 0) {
        return null;
      }
      
      const orderData = order.rows[0];

      // Seconda query: ottieni gli items
      let itemsQuery = `SELECT * FROM order_items WHERE order_id = ? ORDER BY course ASC, created_at ASC`;
      
      let items;
      if (trx) {
        items = await trx.raw(itemsQuery, [id]);
      } else {
        items = await db.raw(itemsQuery, [id]);
      }
      
      orderData.items = items && items.rows ? items.rows : [];

      return orderData;
    } catch (error) {
      console.error('❌ [MODEL] findById error:', error);
      throw error;
    }
  }

  /**
   * Trova ordini attivi (pending o sent)
   * @returns {Promise<Array>}
   */
  static async findActive() {
    return db(this.tableName)
      .select(
        'orders.*',
        'tables.number as table_number',
        'users.username as waiter_username'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .whereIn('orders.status', ['pending', 'sent'])
      .orderBy('orders.created_at', 'asc');
  }

  /**
   * Crea nuovo ordine
   * @param {Object} orderData - { table_id, user_id, covers, items, notes }
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async create(orderData, trx = null) {
    console.log('🔍 [MODEL] Order.create - orderData:', JSON.stringify(orderData, null, 2));
    
    const dbContext = trx || db;
    
    // Estrai esplicitamente i campi invece di usare spread
    const { table_id, user_id, covers, status, notes, items } = orderData;

    console.log('🔍 [MODEL] Order.create - items:', items);
    console.log('🔍 [MODEL] Order.create - items type:', typeof items);
    console.log('🔍 [MODEL] Order.create - isArray:', Array.isArray(items));

    // Usa il servizio centralizzato per i calcoli
    const totals = OrderCalculator.calculateTotals(
      items || [], 
      covers || 0, 
      false // Backend non gestisce isAsporto - gestito dal frontend
    );

    console.log('🔍 [MODEL] Order.create - totals:', totals);

    // Crea ordine
    const orderResult = await dbContext(this.tableName)
      .insert({
        table_id: table_id,
        user_id: user_id,
        status: status || 'pending', // Permette status personalizzato
        covers: covers,
        subtotal: totals.subtotal,
        cover_charge: totals.coverCharge,
        total: totals.total,
        notes: notes || null,
        created_at: dbContext.fn.now()
      })
      .returning('*');

    // Estrai il primo elemento dall'array
    const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

    // Inserisci items
    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        order_id: order.id,
        product_code: item.product_code || 'DEFAULT',
        product_name: item.product_name || 'Prodotto',
        category: item.category_code,
        flavors: JSON.stringify(item.flavors || []),
        quantity: item.quantity,
        course: item.course,
        custom_note: item.custom_note || null,
        unit_price: item.unit_price,
        supplements: JSON.stringify(item.supplements || []),
        supplements_total: item.supplements_total || 0,
        total_price: OrderCalculator.calculateItemTotal(item),
        created_at: dbContext.fn.now()
      }));

      await dbContext('order_items').insert(itemsToInsert);
    }

    return order;
  }

  /**
   * Invia ordine (cambia stato a 'sent')
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async send(id, trx = null) {
    const dbContext = trx || db;

    const order = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'sent',
        sent_at: dbContext.fn.now()
      })
      .returning('*');

    return order;
  }

  /**
   * Completa ordine
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async complete(id, trx = null) {
    const dbContext = trx || db;

    const order = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'completed',
        completed_at: dbContext.fn.now()
      })
      .returning('*');

    return order;
  }

  /**
   * Cancella ordine
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async cancel(id, trx = null) {
    const dbContext = trx || db;

    const order = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'cancelled',
        cancelled_at: dbContext.fn.now()
      })
      .returning('*');

    return order;
  }

  /**
   * Aggiorna ordine
   * @param {number} id
   * @param {Object} orderData
   * @returns {Promise<Object>}
   */
  static async update(id, orderData) {
    // Filtra solo i campi validi per la tabella orders (escludi items)
    const validFields = ['table_id', 'user_id', 'status', 'covers', 'subtotal', 'cover_charge', 'total', 'notes'];
    const filteredData = {};
    
    for (const key of validFields) {
      if (orderData[key] !== undefined) {
        filteredData[key] = orderData[key];
      }
    }
    
    filteredData.updated_at = db.fn.now();

    const order = await db(this.tableName)
      .where({ id })
      .update(filteredData)
      .returning('*');

    return order;
  }

  /**
   * Elimina ordine (hard delete)
   * @param {number} id
   * @returns {Promise<number>}
   */
  static async delete(id) {
    return db(this.tableName).where({ id }).delete();
  }

  /**
   * Trova ordine attivo per tavolo
   * @param {number} tableId
   * @returns {Promise<Object|null>}
   */
  static async findActiveByTableId(tableId) {
    const order = await db(this.tableName)
      .where({ table_id: tableId })
      .whereIn('status', ['pending', 'sent'])
      .orderBy('created_at', 'desc')
      .first();

    if (!order) return null;

    // Carica items
    const items = await db('order_items')
      .where('order_id', order.id)
      .orderBy('created_at', 'asc');

    return {
      ...order,
      items
    };
  }

  /**
   * Trova ordine pending per tavolo
   * @param {number} tableId
   * @returns {Promise<Object|null>}
   */
  static async findPendingByTableId(tableId) {
    const order = await db(this.tableName)
      .where({ 
        table_id: tableId,
        status: 'pending'
      })
      .orderBy('created_at', 'desc')
      .first();

    if (!order) return null;

    // Carica items
    const items = await db('order_items')
      .where('order_id', order.id)
      .orderBy('created_at', 'asc');

    return {
      ...order,
      items
    };
  }

  /**
   * Trova tutti gli ordini per tavolo
   * @param {number} tableId
   * @returns {Promise<Array>}
   */
  static async findByTableId(tableId) {
    const orders = await db(this.tableName)
      .where({ table_id: tableId })
      .orderBy('created_at', 'desc');

    return orders;
  }
}

module.exports = Order;
