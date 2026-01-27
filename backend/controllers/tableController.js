const Table = require('../models/Table');
const Order = require('../models/Order');
const PrintQueue = require('../models/PrintQueue');
const { emitTableUpdate, emitOrderCompleted } = require('../socket/events');

/**
 * Get all tables
 * GET /api/tables
 */
const getAllTables = async (req, res, next) => {
  try {
    const tables = await Table.findAll();

    res.json({
      success: true,
      count: tables.length,
      data: tables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get table by ID (with current order if exists)
 * GET /api/tables/:id
 */
const getTableById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const table = await Table.findByIdWithOrder(id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update table status
 * PUT /api/tables/:id
 */
const updateTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, covers, total } = req.body;

    // Verifica che il tavolo esista
    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    // Aggiorna tavolo
    const updated = await Table.update(id, {
      status: status || table.status,
      covers: covers !== undefined ? covers : table.covers,
      total: total !== undefined ? total : table.total
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      emitTableUpdate(io, updated);
    }

    res.json({
      success: true,
      message: 'Tavolo aggiornato',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Free table (reset to free status)
 * Completa anche l'ordine attivo associato
 * PUT /api/tables/:id/free
 */
const freeTable = async (req, res, next) => {
  try {
    console.log(`🔍 DEBUG - freeTable chiamato - req.params:`, req.params);
    console.log(`🔍 DEBUG - freeTable chiamato - req.user:`, req.user);
    
    const { id } = req.params;
    console.log(`🔍 DEBUG - Tentativo di liberare tavolo ${id}`);

    const table = await Table.findById(id);
    if (!table) {
      console.log(`❌ DEBUG - Tavolo ${id} non trovato`);
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    console.log(`🔍 DEBUG - Tavolo trovato:`, table);

    const db = require('../services/database');
    let completedOrder = null;

    const activeOrders = await db('orders')
      .where({ table_id: id })
      .whereIn('status', ['pending', 'sent']);

    console.log(`🔍 DEBUG - Ordini attivi trovati:`, activeOrders.length);

    await db.transaction(async (trx) => {
      console.log(`🔍 DEBUG - Inizio transazione per liberare tavolo ${id}`);

      for (const order of activeOrders) {
        // Stampa preconto prima di completare l'ordine
        try {
          await PrintQueue.create({
            order_id: order.id,
            print_type: 'preconto',
            status: 'pending'
          }, trx);
          console.log(`🖨️ DEBUG - Preconto ordine ${order.id} aggiunto alla coda di stampa`);
        } catch (printError) {
          console.error(`⚠️ DEBUG - Errore aggiunta preconto alla coda:`, printError);
        }
        
        await trx('orders')
          .where({ id: order.id })
          .update({ status: 'completed', updated_at: trx.fn.now() });
        completedOrder = { ...order, status: 'completed' };
        console.log(`🔍 DEBUG - Ordine ${order.id} completato`);
      }

      // Libera il tavolo
      console.log(`🔍 DEBUG - Chiamata Table.free(${id})`);
      await Table.free(id, trx);
      console.log(`🔍 DEBUG - Table.free(${id}) completato`);
    });

    const freed = await Table.findById(id);
    console.log(`🔍 DEBUG - Tavolo liberato:`, freed);

    for (const order of activeOrders) {
      try {
        const orderItems = await db('order_items')
          .where({ order_id: order.id });

        const salesOrderRows = await db('sales_orders')
          .insert({
            order_id: order.id,
            table_id: order.table_id,
            table_number: table.number,
            user_id: order.user_id,
            covers: order.covers || 0,
            subtotal: order.subtotal || 0,
            cover_charge: order.cover_charge || 0,
            total: order.total || 0,
            created_at: order.created_at || db.fn.now(),
            closed_at: db.fn.now()
          })
          .onConflict('order_id')
          .ignore()
          .returning('id');

        const salesOrderId = Array.isArray(salesOrderRows)
          ? (salesOrderRows[0]?.id || salesOrderRows[0])
          : salesOrderRows?.id;

        if (salesOrderId && orderItems.length > 0) {
          const salesItems = orderItems.map((item) => {
            const normalizeJson = (value) => {
              if (!value) return [];
              if (Array.isArray(value)) return value;
              if (typeof value === 'string') {
                try {
                  return JSON.parse(value);
                } catch (error) {
                  return [];
                }
              }
              return value;
            };

            return {
              sales_order_id: salesOrderId,
              product_name: item.product_name || 'Prodotto',
              category: item.category,
              flavors: normalizeJson(item.flavors),
              supplements: normalizeJson(item.supplements),
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              custom_note: item.custom_note,
              created_at: item.created_at || db.fn.now()
            };
          });

          try {
            await db('sales_items').insert(salesItems);
          } catch (salesItemsError) {
            console.error(`⚠️ DEBUG - Errore inserimento sales_items ordine ${order.id}:`, salesItemsError);
          }
        }
      } catch (snapshotError) {
        console.error(`⚠️ DEBUG - Errore snapshot ordine ${order.id}:`, snapshotError);
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      console.log(`🔍 DEBUG - Emit events per tavolo ${id}`);
      emitTableUpdate(io, freed);
      if (completedOrder) {
        emitOrderCompleted(io, completedOrder);
      }
    }

    console.log(`🔍 DEBUG - Invio risposta successo per tavolo ${id}`);
    res.json({
      success: true,
      message: 'Tavolo liberato',
      data: freed
    });
  } catch (error) {
    console.error('❌ DEBUG - Errore completo in freeTable:', error);
    console.error('❌ DEBUG - Stack trace completo:', error.stack);
    
    // Invia risposta di errore dettagliata
    res.status(500).json({
      success: false,
      error: error.message || 'Errore durante la liberazione del tavolo',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Lock table for current user
 * PUT /api/tables/:id/lock
 */
const lockTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;

    console.log(`🔒 [LOCK] Tentativo lock tavolo ${id} da utente ${userId}`);

    if (!userId) {
      console.log(`❌ [LOCK] User ID mancante`);
      return res.status(400).json({
        success: false,
        error: 'User ID richiesto'
      });
    }

    const table = await Table.findById(id);
    if (!table) {
      console.log(`❌ [LOCK] Tavolo ${id} non trovato`);
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    console.log(`🔍 [LOCK] Tavolo ${id} stato attuale: locked_by=${table.locked_by}`);

    const lockedTable = await Table.lock(id, userId);
    
    if (!lockedTable) {
      // Tavolo già bloccato da altro utente
      const lockInfo = await Table.getLockInfo(id);
      console.log(`❌ [LOCK] Tavolo ${id} già bloccato da utente ${lockInfo?.locked_by}`);
      return res.status(423).json({
        success: false,
        error: 'Tavolo attualmente in uso da un altro utente',
        locked_by: lockInfo?.locked_by
      });
    }

    console.log(`✅ [LOCK] Tavolo ${id} bloccato da utente ${userId}`);
    res.json({
      success: true,
      message: 'Tavolo bloccato',
      data: lockedTable
    });
  } catch (error) {
    console.error(`❌ [LOCK] Errore:`, error);
    next(error);
  }
};

/**
 * Unlock table
 * PUT /api/tables/:id/unlock
 */
const unlockTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID richiesto'
      });
    }

    const success = await Table.unlock(id, userId);
    
    if (!success) {
      return res.status(403).json({
        success: false,
        error: 'Non puoi sbloccare questo tavolo'
      });
    }

    const table = await Table.findById(id);

    res.json({
      success: true,
      message: 'Tavolo sbloccato',
      data: table
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTables,
  getTableById,
  updateTable,
  freeTable,
  lockTable,
  unlockTable
};
