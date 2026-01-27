/**
 * Order Service Layer
 * Business logic centralizzata tra Controller e Model
 * Risolve il problema di Model-Controller Coupling eccessivo
 */

const Order = require('../models/Order');
const Table = require('../models/Table');
const PrintQueue = require('../models/PrintQueue');
const Command = require('../models/Command');
const OperationLogger = require('./operationLogger');
const {
  emitOrderNew,
  emitOrderSent,
  emitOrderCompleted,
  emitOrderCancelled,
  emitTableUpdate,
  emitOrderTableBatch,
  emitOrderItemsAdded,
  initializeEventBatcher
} = require('../socket/events');

class OrderService {
  /**
   * Crea nuovo ordine con business logic centralizzata
   * @param {Object} orderData - Dati ordine
   * @param {Object} user - Utente che crea l'ordine
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>}
   */
  static async createOrder(orderData, user, io) {
    console.log('🔍 [SERVICE] createOrder - orderData:', JSON.stringify(orderData, null, 2));
    console.log('🔍 [SERVICE] createOrder - user:', user);
    
    const { table_id, covers, items, notes, status } = orderData;

    // Validazioni business logic
    if (!table_id) {
      throw new Error('table_id è obbligatorio');
    }

    // Items possono essere vuoti all'apertura tavolo (solo coperti selezionati)
    const itemsList = items || [];

    // Per ordini aggiuntivi su tavoli occupied, covers può essere 0
    const coversNum = parseInt(covers, 10);
    if (coversNum !== 0 && isNaN(coversNum)) {
      throw new Error('covers deve essere un numero valido');
    }

    // Verifica che il tavolo esista
    const table = await Table.findById(table_id);
    if (!table) {
      throw new Error('Tavolo non trovato');
    }

    // 🔒 LOCK CONCORRENTE: Verifica e acquisisci lock
    const lockedTable = await Table.lock(table_id, user.userId);
    if (!lockedTable) {
      const lockInfo = await Table.getLockInfo(table_id);
      throw new Error(`Tavolo ${table.number} attualmente in uso da un altro utente`);
    }

    // Business rules per stati tavolo
    if (table.status === 'pending') {
      // Se il tavolo è pending, deve essere dello stesso utente
      if (table.locked_by !== user.userId) {
        await Table.unlock(table_id, user.userId);
        throw new Error(`Tavolo ${table.number} ha già un ordine in attesa - usa aggiorna ordine`);
      }
    }

    if (table.status === 'occupied' && coversNum > 0) {
      await Table.unlock(table_id, user.userId);
      throw new Error(`Tavolo ${table.number} è occupato - i coperti devono essere 0 per ordini aggiuntivi`);
    }

    if (table.status === 'occupied' && status !== 'sent') {
      await Table.unlock(table_id, user.userId);
      throw new Error(`Ordini aggiuntivi su tavoli occupied devono avere status 'sent'`);
    }

    // Esegui logica business con transazione atomica
    const db = require('./database');
    let completeOrder, updatedTable;

    try {
      await db.transaction(async (trx) => {
        console.log('🔍 [SERVICE] Inizio transazione');
        
        // Crea ordine
        console.log('🔍 [SERVICE] Creazione ordine...');
        const order = await Order.create({
          table_id,
          user_id: user.userId,
          covers: coversNum,
          status: status || 'pending',
          items: itemsList,
          notes
        }, trx);
        console.log('🔍 [SERVICE] Ordine creato:', order);

        // Aggiorna stato tavolo secondo business rules
        console.log('🔍 [SERVICE] Aggiornamento tavolo...');
        if (table.status === 'free') {
          // Tavolo libero: diventa pending o occupied in base allo status ordine
          if (status === 'sent') {
            updatedTable = await Table.setOccupied(table_id, coversNum, order.total, trx);
          } else {
            updatedTable = await Table.setPending(table_id, coversNum, order.total, trx);
          }
        } else if (status === 'sent') {
          // Ordine creato come sent su tavolo già pending/occupied: assicura sia occupied
          updatedTable = await Table.setOccupied(table_id, coversNum, order.total, trx);
        } else {
          // Per altri casi, non aggiornare stato
          updatedTable = await Table.findById(table_id, trx);
        }
        console.log(' [SERVICE] Tavolo aggiornato:', updatedTable);

        // Ritorna ordine completo
        console.log(' [SERVICE] Caricamento ordine completo...');
        completeOrder = order;
        console.log(' [SERVICE] Ordine completo caricato (base):', completeOrder);
      });
    } catch (transactionError) {
      console.error(' [SERVICE] Errore transazione:', transactionError);
      console.error(' [SERVICE] Stack trace:', transactionError.stack);
      console.error('❌ [SERVICE] Stack trace:', transactionError.stack);
      throw transactionError;
    }

    // Emit eventi batched
    if (io) {
      try {
        emitOrderTableBatch('new', completeOrder, updatedTable);
      } catch (emitError) {
        console.error('⚠️ Failed to emit Socket.IO events:', emitError.message);
      }
    }

    return completeOrder;
  }

  /**
   * Invia ordine esistente
   * @param {number} orderId - ID ordine
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>}
   */
  static async sendOrder(orderId, io) {
    // Validazioni business
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Ordine non trovato');
    }

    // Permetti invio di ordini pending O sent (per comande multiple)
    if (!['pending', 'sent'].includes(order.status)) {
      throw new Error('Solo ordini pending o inviati possono generare comande');
    }

    // Business rules per stato tavolo
    const table = await Table.findById(order.table_id);
    if (!table) {
      throw new Error('Tavolo non trovato');
    }

    // Permetti invio se tavolo è pending, occupied, o se ordine ha items non inviati
    if (!['pending', 'occupied'].includes(table.status)) {
      throw new Error('Tavolo non in stato appropriato per inviare ordine');
    }

    // Esegui logica con transazione atomica
    const db = require('./database');
    let updatedOrder, updatedTable, newCommand;

    await db.transaction(async (trx) => {
      // Trova items non ancora associati a una comanda
      const unsentItems = await Command.findUnsentItems(orderId);
      
      if (unsentItems.length > 0) {
        // Crea nuova comanda per questi items
        const itemIds = unsentItems.map(item => item.id);
        newCommand = await Command.create(orderId, itemIds, trx);
        
        // Marca comanda come inviata
        await Command.markSent(newCommand.id, trx);
        
        console.log(`📤 [SERVICE] Creata comanda #${newCommand.command_number} per ordine #${orderId} con ${itemIds.length} items`);
      }

      // Invia ordine (aggiorna status a sent)
      await Order.send(orderId, trx);

      // Aggiorna tavolo a occupied (SEMPRE quando si invia comanda)
      const orderTotal = parseFloat(order.total) || 0;
      console.log(`🔄 [SERVICE] Aggiorno tavolo ${order.table_id} a occupied (covers: ${order.covers}, total: ${orderTotal})`);
      updatedTable = await Table.setOccupied(order.table_id, order.covers, orderTotal, trx);
      console.log(`✅ [SERVICE] Tavolo aggiornato:`, updatedTable?.status);

      // Aggiungi a coda stampa SOLO se è stata creata una nuova comanda
      if (newCommand) {
        await PrintQueue.create(orderId, newCommand.id, trx);
      }

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(orderId, trx);
    });

    // Snapshot ordini COMPLETATI viene gestito in completeOrder

    // Log operazione critica
    await OperationLogger.logOrderSend(
      order.user_id,
      orderId,
      order.table_id,
      newCommand?.command_number || 1,
      newCommand ? await Command.findUnsentItems(orderId).length : order.items?.length || 0
    );

    // Emit eventi batched
    if (io) {
      try {
        emitOrderTableBatch('sent', updatedOrder, updatedTable);
      } catch (emitError) {
        console.error('⚠️ Failed to emit Socket.IO events:', emitError.message);
      }
    }

    return updatedOrder;
  }

  /**
   * Completa ordine
   * @param {number} orderId - ID ordine
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>}
   */
  static async completeOrder(orderId, io) {
    // Validazioni business
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Ordine non trovato');
    }

    if (!['sent', 'pending'].includes(order.status)) {
      throw new Error(`Ordine in stato ${order.status} non può essere completato`);
    }

    // Business rules per stato tavolo
    const table = await Table.findById(order.table_id);
    if (!table || !['occupied', 'pending'].includes(table.status)) {
      throw new Error('Stato tavolo inconsistente - impossibile completare ordine');
    }

    // Esegui logica con transazione atomica
    const db = require('./database');
    let updatedOrder, freedTable;

    await db.transaction(async (trx) => {
      // Completa ordine
      await Order.complete(orderId, trx);

      // Libera tavolo
      freedTable = await Table.free(order.table_id, trx);

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(orderId, trx);
    });

    // Emit eventi batched
    if (io) {
      try {
        emitOrderTableBatch('completed', updatedOrder, freedTable);
      } catch (emitError) {
        console.error('⚠️ Failed to emit Socket.IO events:', emitError.message);
      }
    }

    return updatedOrder;
  }

  /**
   * Cancella ordine
   * @param {number} orderId - ID ordine
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>}
   */
  static async cancelOrder(orderId, io) {
    // Validazioni business
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Ordine non trovato');
    }

    if (!['pending', 'sent'].includes(order.status)) {
      throw new Error(`Ordine in stato ${order.status} non può essere cancellato`);
    }

    // Esegui logica con transazione atomica
    const db = require('./database');
    let updatedOrder, freedTable;

    await db.transaction(async (trx) => {
      // Cancella ordine
      await Order.cancel(orderId, trx);

      // Se l'ordine era pending o sent, libera il tavolo
      if (['pending', 'sent'].includes(order.status)) {
        freedTable = await Table.free(order.table_id, trx);
      }

      // Ritorna ordine aggiornato
      updatedOrder = await Order.findById(orderId, trx);
    });

    // Emit eventi batched
    if (io) {
      try {
        emitOrderTableBatch('cancelled', updatedOrder, freedTable);
      } catch (emitError) {
        console.error('⚠️ Failed to emit Socket.IO events:', emitError.message);
      }
    }

    return updatedOrder;
  }

  /**
   * Aggiorna ordine esistente
   * @param {number} orderId - ID ordine
   * @param {Object} updateData - Dati aggiornamento
   * @returns {Promise<Object>}
   */
  static async updateOrder(orderId, updateData) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Ordine non trovato');
    }

    // Permetti update su ordini pending O sent (per comande aggiuntive)
    if (!['pending', 'sent'].includes(order.status)) {
      throw new Error('Solo ordini pending o inviati possono essere aggiornati');
    }

    return await Order.update(orderId, updateData);
  }

  /**
   * Calcola totali ordine
   * @param {Array} items - Items ordine
   * @param {number} covers - Numero coperti
   * @param {boolean} isAsporto - Se è asporto
   * @returns {Object} Totali calcolati
   */
  static calculateTotals(items = [], covers = 0, isAsporto = false) {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.unit_price + (item.supplements_total || 0)) * item.quantity;
      return sum + itemTotal;
    }, 0);

    const coverCharge = isAsporto ? 0 : covers * 0.20;
    const total = subtotal + coverCharge;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      coverCharge: Math.round(coverCharge * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Aggiunge items a un ordine esistente
   * @param {number} orderId - ID ordine
   * @param {Array} newItems - Nuovi items da aggiungere
   * @param {Object} user - Utente che aggiunge items
   * @param {Object} io - Socket.IO instance
   * @returns {Promise<Object>}
   */
  static async addItemsToOrder(orderId, newItems, user, io) {
    console.log('🔍 [SERVICE] addItemsToOrder - orderId:', orderId);
    console.log('🔍 [SERVICE] addItemsToOrder - newItems:', newItems);

    // Validazioni business
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Ordine non trovato');
    }

    // Permetti aggiunta items a ordini pending O sent (per comande multiple)
    if (!['pending', 'sent'].includes(order.status)) {
      throw new Error('Si possono aggiungere prodotti solo a ordini pending o inviati');
    }

    // Esegui logica con transazione atomica
    const db = require('./database');
    let updatedOrder;

    try {
      await db.transaction(async (trx) => {
        // Inserisci nuovi items
        for (const item of newItems) {
          await db('order_items').insert({
            order_id: orderId,
            product_code: item.product_code || 'DEFAULT',
            product_name: item.product_name || 'Prodotto',
            category: item.category_code,
            flavors: JSON.stringify(item.flavors || []),
            quantity: item.quantity,
            course: item.course,
            custom_note: item.custom_note || null,
            unit_price: item.unit_price,
            supplements_total: item.supplements_total || 0,
            total_price: (item.unit_price + (item.supplements_total || 0)) * item.quantity,
            created_at: db.fn.now()
          }).transacting(trx);
        }

        // Ricalcola totali ordine
        const allItems = await db('order_items')
          .where('order_id', orderId)
          .transacting(trx);

        // Converti gli items dal database al formato corretto per calculateTotals
        const formattedItems = allItems.map(item => ({
          unit_price: parseFloat(item.unit_price) || 0,
          quantity: parseInt(item.quantity) || 0,
          supplements_total: parseFloat(item.supplements_total) || 0
        }));

        const totals = OrderService.calculateTotals(formattedItems, parseInt(order.covers) || 0, false);

        // Aggiorna totali ordine
        await db('orders')
          .where('id', orderId)
          .update({
            subtotal: totals.subtotal,
            cover_charge: totals.coverCharge,
            total: totals.total,
            updated_at: db.fn.now()
          })
          .transacting(trx);

        // Se l'ordine è pending e il tavolo è pending, aggiorna il tavolo a occupied
        if (order.status === 'pending') {
          const table = await Table.findById(order.table_id, trx);
          if (table && table.status === 'pending') {
            await Table.setOccupied(order.table_id, order.covers, totals.total, trx);
          }
        }

        // Ritorna ordine aggiornato
        updatedOrder = await Order.findById(orderId, trx);
      });
    } catch (transactionError) {
      console.error('❌ [SERVICE] Errore transazione addItemsToOrder:', transactionError);
      throw transactionError;
    }

    // Emit eventi specifici per aggiunta items
    if (io) {
      try {
        const table = await Table.findById(order.table_id);
        emitOrderItemsAdded(io, updatedOrder, table);
      } catch (emitError) {
        console.error('⚠️ Failed to emit Socket.IO events:', emitError.message);
      }
    }

    return updatedOrder;
  }
}

module.exports = OrderService;
