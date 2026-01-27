const Table = require('../models/Table');
const Order = require('../models/Order');

/**
 * Middleware per gestione flussi operativi tavoli
 * Verifica che le operazioni siano consentite secondo il flusso gelateria
 */

const checkTableFlow = async (req, res, next) => {
  try {
    // table_id può essere in body (POST /open) o in params (PUT /:table_id/items)
    const table_id = req.body.table_id || req.params.table_id;
    const userId = req.user.userId;

    if (!table_id) {
      return res.status(400).json({
        success: false,
        error: 'table_id è obbligatorio'
      });
    }

    const table = await Table.findById(table_id);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Tavolo non trovato'
      });
    }

    // 🔒 Verifica lock concorrente - solo se tavolo è bloccato da ALTRO utente
    if (table.locked_by && table.locked_by !== userId) {
      return res.status(409).json({
        success: false,
        error: 'Tavolo attualmente in uso',
        message: 'Il tavolo è bloccato da un altro utente'
      });
    }

    // Se il tavolo non è bloccato o è bloccato dallo stesso utente, continua
    // Acquisisci/rinnova lock solo se necessario
    if (!table.locked_by) {
      const lockedTable = await Table.lock(table_id, userId);
      if (!lockedTable) {
        return res.status(409).json({
          success: false,
          error: 'Impossibile acquisire lock sul tavolo'
        });
      }
    }

    // Aggiungi info tavolo alla request per uso successivo
    req.tableInfo = table;

    next();
  } catch (error) {
    console.error('❌ [FLOW] Errore checkTableFlow:', error);
    res.status(500).json({
      success: false,
      error: 'Errore verifica flusso tavolo'
    });
  }
};

/**
 * Verifica flusso per apertura tavolo (LIBERO → IN ATTESA)
 */
const checkOpenTableFlow = async (req, res, next) => {
  const { tableInfo } = req;
  const { covers } = req.body;

  // Solo tavoli liberi possono essere aperti
  if (tableInfo.status !== 'free') {
    return res.status(400).json({
      success: false,
      error: `Tavolo ${tableInfo.number} non è libero - stato attuale: ${tableInfo.status}`
    });
  }

  // Coperti obbligatori
  if (!covers || parseInt(covers) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'I coperti sono obbligatori e devono essere maggiori di 0'
    });
  }

  next();
};

/**
 * Verifica flusso per aggiunta prodotti (IN ATTESA/OCCUPATO)
 */
const checkAddItemsFlow = async (req, res, next) => {
  const { tableInfo } = req;

  // Solo tavoli pending o occupied possono ricevere prodotti
  if (!['pending', 'occupied'].includes(tableInfo.status)) {
    return res.status(400).json({
      success: false,
      error: `Tavolo ${tableInfo.number} non può ricevere prodotti - stato: ${tableInfo.status}`
    });
  }

  next();
};

/**
 * Verifica flusso per invio comanda
 */
const checkSendOrderFlow = async (req, res, next) => {
  const { tableInfo } = req;
  const orderId = req.params.id || req.body.order_id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: 'order_id è obbligatorio'
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Ordine non trovato'
    });
  }

  // Solo ordini pending possono essere inviati
  if (order.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Ordine in stato ${order.status} non può essere inviato`
    });
  }

  // Verifica che l'ordine appartenga al tavolo corretto
  if (order.table_id !== tableInfo.id) {
    return res.status(400).json({
      success: false,
      error: 'Ordine non appartiene a questo tavolo'
    });
  }

  req.orderInfo = order;
  next();
};

/**
 * Verifica flusso per annulla comanda
 */
const checkCancelOrderFlow = async (req, res, next) => {
  const { tableInfo } = req;
  const orderId = req.params.id;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: 'order_id è obbligatorio'
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Ordine non trovato'
    });
  }

  // Solo ordini pending possono essere annullati
  if (order.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Ordine in stato ${order.status} non può essere annullato`
    });
  }

  // Verifica appartenenza tavolo
  if (order.table_id !== tableInfo.id) {
    return res.status(400).json({
      success: false,
      error: 'Ordine non appartiene a questo tavolo'
    });
  }

  req.orderInfo = order;
  next();
};

/**
 * Verifica flusso per libera tavolo
 */
const checkFreeTableFlow = async (req, res, next) => {
  const { tableInfo } = req;

  // Solo tavoli pending o occupied possono essere liberati
  if (!['pending', 'occupied'].includes(tableInfo.status)) {
    return res.status(400).json({
      success: false,
      error: `Tavolo ${tableInfo.number} è già libero`
    });
  }

  // Controlla se ci sono ordini non inviati
  const pendingOrders = await Order.findByTableId(tableInfo.id);
  const hasUnsentOrders = pendingOrders.some(order => order.status === 'pending');

  if (hasUnsentOrders) {
    req.hasUnsentOrders = true;
    // Non bloccare il flusso, ma segnala per conferma
  }

  next();
};

module.exports = {
  checkTableFlow,
  checkOpenTableFlow,
  checkAddItemsFlow,
  checkSendOrderFlow,
  checkCancelOrderFlow,
  checkFreeTableFlow
};
