const Order = require('../models/Order');
const Table = require('../models/Table');
const PrintQueue = require('../models/PrintQueue');
const {
  emitTableUpdate,
  emitOrderNew,
  emitOrderUpdate,
  emitOrderSent,
  emitOrderCompleted,
  emitOrderCancelled
} = require('../socket/events');

/**
 * Get all orders (with filters)
 * GET /api/orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      table_id: req.query.table_id ? parseInt(req.query.table_id) : undefined,
      user_id: req.query.user_id ? parseInt(req.query.user_id) : undefined
    };

    const orders = await Order.findAll(filters);

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active orders (pending or sent)
 * GET /api/orders/active
 */
const getActiveOrders = async (req, res, next) => {
  try {
    const orders = await Order.findActive();

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID (with items)
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new order
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { table_id, covers, items, notes } = req.body;

    // Validazione
    if (!table_id || !covers || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'table_id, covers e items sono obbligatori'
      });
    }

    // Verifica che il tavolo esista e sia libero
    const table = await Table.findById(table_id);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    // VALIDAZIONE STATO TAVOLO: solo tavoli liberi possono avere nuovi ordini
    if (table.status !== 'free') {
      return res.status(400).json({
        success: false,
        error: `Tavolo ${table.number} non è libero (stato: ${table.status})`
      });
    }

    // TRANSAZIONE ATOMICA: Order + Table update insieme
    const db = require('../services/database');
    let completeOrder, updatedTable;

    await db.transaction(async (trx) => {
      // Crea ordine (con items) dentro transazione
      const order = await Order.create({
        table_id,
        user_id: req.user.userId,
        covers,
        items,
        notes
      }, trx);

      // Aggiorna stato tavolo a pending dentro stessa transazione
      updatedTable = await Table.setPending(table_id, covers, order.total, trx);

      // Ritorna ordine completo con items
      completeOrder = await Order.findById(order.id, trx);
    });
    // Se qualsiasi step fallisce, tutto viene rollback automaticamente

    // Emit real-time events (DOPO commit transazione)
    const io = req.app.get('io');
    if (io) {
      try {
        emitOrderNew(io, completeOrder);
        emitTableUpdate(io, updatedTable);
      } catch (emitError) {
        console.error('⚠️  Failed to emit Socket.IO events:', emitError.message);
        // Non bloccare la risposta - dati sono salvati correttamente
      }
    } else {
      console.warn('⚠️  Socket.IO not available - events not emitted');
    }

    res.status(201).json({
      success: true,
      message: 'Ordine creato',
      data: completeOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send order (change status to sent + add to print queue)
 * PUT /api/orders/:id/send
 */
const sendOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verifica che l'ordine esista
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    // Verifica che sia pending
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo ordini pending possono essere inviati'
      });
    }

    // VALIDAZIONE STATO TAVOLO: il tavolo deve essere pending
    const table = await Table.findById(order.table_id);
    if (!table || table.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Tavolo non in stato pending - impossibile inviare ordine'
      });
    }

    // TRANSAZIONE ATOMICA: Order + Table + PrintQueue insieme
    const db = require('../services/database');
    let updatedOrder, updatedTable;

    await db.transaction(async (trx) => {
      // Invia ordine
      await Order.send(id, trx);

      // Aggiorna tavolo a occupied
      updatedTable = await Table.setOccupied(order.table_id, order.covers, order.total, trx);

      // Aggiungi a coda stampa (CRITICO: deve essere nello stesso transaction)
      await PrintQueue.create(id, null, trx);

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(id, trx);
    });
    // Se PrintQueue.create fallisce, Order.send e Table.setOccupied vengono rollback

    // Emit real-time events (DOPO commit transazione)
    const io = req.app.get('io');
    if (io) {
      try {
        emitOrderSent(io, updatedOrder);
        emitTableUpdate(io, updatedTable);
      } catch (emitError) {
        console.error('⚠️  Failed to emit Socket.IO events:', emitError.message);
      }
    } else {
      console.warn('⚠️  Socket.IO not available - events not emitted');
    }

    res.json({
      success: true,
      message: 'Ordine inviato e inserito in coda stampa',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete order
 * PUT /api/orders/:id/complete
 */
const completeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    // VALIDAZIONE STATI ORDINE: solo sent o pending possono essere completati
    if (!['sent', 'pending'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Ordine in stato ${order.status} non può essere completato`
      });
    }

    // VALIDAZIONE STATO TAVOLO: il tavolo deve essere occupied o pending
    const table = await Table.findById(order.table_id);
    if (!table || !['occupied', 'pending'].includes(table.status)) {
      return res.status(400).json({
        success: false,
        error: 'Stato tavolo inconsistente - impossibile completare ordine'
      });
    }

    // TRANSAZIONE ATOMICA: Order + Table insieme
    const db = require('../services/database');
    let updatedOrder, freedTable;

    await db.transaction(async (trx) => {
      // Completa ordine dentro transazione
      await Order.complete(id, trx);

      // Libera tavolo dentro stessa transazione
      freedTable = await Table.free(order.table_id, trx);

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(id, trx);
    });
    // Se Table.free fallisce, Order.complete viene rollback

    // Emit real-time events (DOPO commit transazione)
    const io = req.app.get('io');
    if (io) {
      try {
        emitOrderCompleted(io, updatedOrder);
        emitTableUpdate(io, freedTable);
      } catch (emitError) {
        console.error('⚠️  Failed to emit Socket.IO events:', emitError.message);
      }
    } else {
      console.warn('⚠️  Socket.IO not available - events not emitted');
    }

    res.json({
      success: true,
      message: 'Ordine completato e tavolo liberato',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 * PUT /api/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    // VALIDAZIONE STATI ORDINE: solo pending e sent possono essere cancellati
    if (!['pending', 'sent'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Ordine in stato ${order.status} non può essere cancellato`
      });
    }

    // TRANSAZIONE ATOMICA: Order + Table insieme
    const db = require('../services/database');
    let updatedOrder, freedTable;

    await db.transaction(async (trx) => {
      // Cancella ordine dentro transazione
      await Order.cancel(id, trx);

      // Se l'ordine era pending o sent, libera il tavolo dentro stessa transazione
      if (['pending', 'sent'].includes(order.status)) {
        freedTable = await Table.free(order.table_id, trx);
      }

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(id, trx);
    });

    // Emit real-time events (DOPO commit transazione)
    const io = req.app.get('io');
    if (io) {
      try {
        emitOrderCancelled(io, updatedOrder);
        if (freedTable) {
          emitTableUpdate(io, freedTable);
        }
      } catch (emitError) {
        console.error('⚠️  Failed to emit Socket.IO events:', emitError.message);
      }
    } else {
      console.warn('⚠️  Socket.IO not available - events not emitted');
    }

    res.json({
      success: true,
      message: 'Ordine cancellato',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order (items, covers)
 * PUT /api/orders/:id
 */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { covers, items } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    // Solo ordini pending possono essere aggiornati
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo ordini pending possono essere modificati'
      });
    }

    // VALIDAZIONE STATO TAVOLO: il tavolo deve essere pending
    const table = await Table.findById(order.table_id);
    if (!table || table.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Stato tavolo inconsistente - impossibile aggiornare ordine'
      });
    }

    const db = require('../services/database');

    await db.transaction(async (trx) => {
      // Elimina vecchi items
      await trx('order_items').where({ order_id: id }).delete();

      // Calcola nuovi totali
      let subtotal = 0;
      if (items && items.length > 0) {
        subtotal = items.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price);
        }, 0);

        // Inserisci nuovi items
        const orderItems = items.map(item => ({
          order_id: parseInt(id),
          product_code: item.product_code || null,
          product_name: item.product_name || null,
          category: item.category || item.category_code,
          flavors: JSON.stringify(item.flavors || []),
          quantity: item.quantity,
          course: item.course || 1,
          custom_note: item.custom_note || null,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
          created_at: trx.fn.now()
        }));

        await trx('order_items').insert(orderItems);
      }

      // Aggiorna ordine
      const cover_charge = (covers || order.covers) * 0.20;
      const total = subtotal + cover_charge;

      await trx('orders')
        .where({ id })
        .update({
          covers: covers || order.covers,
          subtotal,
          cover_charge,
          total
        });

      // Aggiorna tavolo
      await trx('tables')
        .where({ id: order.table_id })
        .update({
          total,
          updated_at: trx.fn.now()
        });
    });

    const updatedOrder = await Order.findById(id);

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      try {
        emitOrderUpdate(io, updatedOrder);
      } catch (emitError) {
        console.error('⚠️  Failed to emit Socket.IO events:', emitError.message);
      }
    } else {
      console.warn('⚠️  Socket.IO not available - events not emitted');
    }

    res.json({
      success: true,
      message: 'Ordine aggiornato',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete order (hard delete)
 * DELETE /api/orders/:id
 */
const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordine non trovato'
      });
    }

    // VALIDAZIONE: solo ordini in stati non critici possono essere eliminati
    if (!['pending', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Ordine in stato ${order.status} non può essere eliminato`
      });
    }

    await Order.delete(id);

    res.json({
      success: true,
      message: 'Ordine eliminato'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getActiveOrders,
  getOrderById,
  createOrder,
  updateOrder,
  sendOrder,
  completeOrder,
  cancelOrder,
  deleteOrder
};
