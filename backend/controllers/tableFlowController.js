const OrderService = require('../services/orderService');
const Table = require('../models/Table');
const Order = require('../models/Order');
const OperationLogger = require('../services/operationLogger');

/**
 * Apri tavolo (LIBERO → IN ATTESA)
 * POST /api/tables/open
 */
const openTable = async (req, res, next) => {
  try {
    const { table_id, covers, customer_name } = req.body;
    const io = req.app.get('io');

    console.log('🔍 [FLOW] openTable - table_id:', table_id, 'covers:', covers);

    // Crea ordine iniziale (senza prodotti)
    const orderData = {
      table_id,
      covers,
      items: [], // Nessun prodotto all'apertura
      notes: customer_name ? `Cliente: ${customer_name}` : null
    };

    const order = await OrderService.createOrder(orderData, req.user, io);

    // Il tavolo passa automaticamente a pending tramite OrderService
    const updatedTable = await Table.findById(table_id);

    // Log operazione critica
    await OperationLogger.logTableOpen(
      req.user.userId,
      table_id,
      updatedTable.number,
      covers,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Tavolo aperto con successo',
      data: {
        table: updatedTable,
        order: order
      }
    });
  } catch (error) {
    console.error('❌ [FLOW] Errore openTable:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Aggiungi prodotti a tavolo (IN ATTESA/OCCUPATO)
 * PUT /api/tables/:table_id/items
 */
const addItemsToTable = async (req, res, next) => {
  try {
    const { table_id } = req.params;
    const { items } = req.body;
    const io = req.app.get('io');

    console.log('🔍 [FLOW] addItemsToTable - table_id:', table_id, 'items:', items);

    // Trova ordine attivo per questo tavolo
    const activeOrder = await Order.findActiveByTableId(table_id);
    if (!activeOrder) {
      return res.status(404).json({
        success: false,
        error: 'Nessun ordine attivo trovato per questo tavolo'
      });
    }

    // Aggiungi items all'ordine esistente
    const updatedOrder = await OrderService.addItemsToOrder(activeOrder.id, items, req.user, io);

    // Se il tavolo era pending e ora ha prodotti inviati, potrebbe passare a occupied
    const updatedTable = await Table.findById(table_id);

    res.json({
      success: true,
      message: 'Prodotti aggiunti con successo',
      data: {
        table: updatedTable,
        order: updatedOrder
      }
    });
  } catch (error) {
    console.error('❌ [FLOW] Errore addItemsToTable:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Invia comanda (IN ATTESA/OCCUPATO con nuovi prodotti)
 * PUT /api/tables/:table_id/send-order
 */
const sendOrderFromTable = async (req, res, next) => {
  try {
    const { table_id } = req.params;
    const io = req.app.get('io');

    console.log('🔍 [FLOW] sendOrderFromTable - table_id:', table_id);

    // Cerca prima ordine pending, poi ordine sent con items non inviati
    let orderToSend = await Order.findPendingByTableId(table_id);
    
    if (!orderToSend) {
      // Se non c'è ordine pending, cerca ordine sent/attivo con items da inviare
      orderToSend = await Order.findActiveByTableId(table_id);
      
      if (!orderToSend) {
        return res.status(404).json({
          success: false,
          error: 'Nessun ordine attivo trovato per questo tavolo'
        });
      }
      
      // Verifica se ci sono items non ancora inviati (senza command_id)
      const Command = require('../models/Command');
      const unsentItems = await Command.findUnsentItems(orderToSend.id);
      
      if (unsentItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nessun nuovo prodotto da inviare'
        });
      }
    }

    // Invia l'ordine (crea nuova comanda per items non inviati)
    const sentOrder = await OrderService.sendOrder(orderToSend.id, io);

    // Il tavolo passa a occupied
    const updatedTable = await Table.findById(table_id);

    res.json({
      success: true,
      message: 'Comanda inviata con successo',
      data: {
        table: updatedTable,
        order: sentOrder
      }
    });
  } catch (error) {
    console.error('❌ [FLOW] Errore sendOrderFromTable:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Annulla comanda (IN ATTESA → LIBERO)
 * DELETE /api/tables/:table_id/cancel-order
 */
const cancelOrderFromTable = async (req, res, next) => {
  try {
    const { table_id } = req.params;
    const io = req.app.get('io');

    console.log('🔍 [FLOW] cancelOrderFromTable - table_id:', table_id);

    // Trova ordine pending da annullare
    const pendingOrder = await Order.findPendingByTableId(table_id);
    if (!pendingOrder) {
      return res.status(404).json({
        success: false,
        error: 'Nessun ordine in attesa trovato per questo tavolo'
      });
    }

    // Annulla l'ordine (cancella e libera tavolo)
    const cancelledOrder = await OrderService.cancelOrder(pendingOrder.id, io);

    // Il tavolo torna libero
    const updatedTable = await Table.findById(table_id);

    res.json({
      success: true,
      message: 'Comanda annullata e tavolo liberato',
      data: {
        table: updatedTable,
        order: cancelledOrder
      }
    });
  } catch (error) {
    console.error('❌ [FLOW] Errore cancelOrderFromTable:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Libera tavolo e stampa preconto (OCCUPATO → LIBERO)
 * POST /api/tables/:table_id/free
 */
const freeTable = async (req, res, next) => {
  try {
    const { table_id } = req.params;
    const { force } = req.body; // Forza liberazione anche con prodotti non inviati
    const io = req.app.get('io');
    const PrintQueue = require('../models/PrintQueue');

    console.log('🔍 [FLOW] freeTable - table_id:', table_id, 'force:', force);

    // Controlla se ci sono prodotti non inviati
    const pendingOrder = await Order.findPendingByTableId(table_id);
    if (pendingOrder && !force) {
      return res.status(400).json({
        success: false,
        error: 'Ci sono prodotti non ancora inviati',
        message: 'Alcuni prodotti non sono stati ancora inviati. Usa force: true per confermare la liberazione.',
        has_unsent_items: true
      });
    }

    // Trova tutti gli ordini attivi del tavolo per il preconto
    const orders = await Order.findByTableId(table_id);
    const activeOrders = orders.filter(o => ['pending', 'sent'].includes(o.status));
    
    // Completa tutti gli ordini attivi e stampa preconto
    for (const order of activeOrders) {
      // Crea job stampa preconto PRIMA di completare l'ordine
      await PrintQueue.createPreconto(order.id);

      // Snapshot ordine completato per dashboard
      try {
        const db = require('../services/database');
        await db.transaction(async (trx) => {
          const orderItems = await trx('order_items')
            .where({ order_id: order.id });

          const salesOrderRows = await trx('sales_orders')
            .insert({
              order_id: order.id,
              table_id: order.table_id,
              table_number: (await Table.findById(order.table_id))?.number || null,
              user_id: order.user_id,
              covers: order.covers || 0,
              subtotal: order.subtotal || 0,
              cover_charge: order.cover_charge || 0,
              total: order.total || 0,
              created_at: order.created_at || trx.fn.now(),
              closed_at: trx.fn.now()
            })
            .onConflict('order_id')
            .ignore()
            .returning('id');

          const salesOrderId = Array.isArray(salesOrderRows)
            ? (salesOrderRows[0]?.id || salesOrderRows[0])
            : salesOrderRows?.id;

          if (salesOrderId && orderItems.length > 0) {
            const salesItems = orderItems.map((item) => ({
              sales_order_id: salesOrderId,
              product_name: item.product_name || 'Prodotto',
              category: item.category,
              flavors: item.flavors,
              supplements: item.supplements,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              custom_note: item.custom_note,
              created_at: item.created_at || trx.fn.now()
            }));

            await trx('sales_items').insert(salesItems);
          }
        });
      } catch (snapshotError) {
        console.error(`⚠️ [FLOW] Errore snapshot ordine ${order.id}:`, snapshotError);
      }
      
      // Completa l'ordine
      await OrderService.completeOrder(order.id, io);
    }

    console.log(`🧾 [FLOW] Preconto creato per ${activeOrders.length} ordini del tavolo ${table_id}`);

    // Il tavolo torna libero
    const updatedTable = await Table.findById(table_id);

    // Calcola totale incassato
    const totalRevenue = activeOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    // Log operazione critica
    await OperationLogger.logTableFree(
      req.user.userId,
      table_id,
      updatedTable.number,
      totalRevenue,
      req.ip
    );

    // Sblocca il tavolo (forza sblocco per liberazione completa)
    await Table.forceUnlock(table_id);

    res.json({
      success: true,
      message: 'Tavolo liberato e preconto stampato',
      data: {
        table: updatedTable,
        preconto_printed: activeOrders.length > 0,
        orders_completed: activeOrders.length
      }
    });
  } catch (error) {
    console.error('❌ [FLOW] Errore freeTable:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  openTable,
  addItemsToTable,
  sendOrderFromTable,
  cancelOrderFromTable,
  freeTable
};
