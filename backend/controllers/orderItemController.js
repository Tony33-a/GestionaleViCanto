const OrderService = require('../services/orderService');

/**
 * Add items to existing order
 * PUT /api/orders/:id/items
 */
const addItemsToOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const io = req.app.get('io');

    console.log('🔍 [CONTROLLER] addItemsToOrder - order_id:', id);
    console.log('🔍 [CONTROLLER] addItemsToOrder - items:', items);

    // Validazioni
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items deve essere un array non vuoto'
      });
    }

    // Usa OrderService per aggiungere items
    const updatedOrder = await OrderService.addItemsToOrder(id, items, req.user, io);

    res.json({
      success: true,
      message: 'Prodotti aggiunti all\'ordine',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ Errore in addItemsToOrder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Send order after adding items
 * PUT /api/orders/:id/send-with-items
 */
const sendOrderWithItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const io = req.app.get('io');

    console.log('🔍 [CONTROLLER] sendOrderWithItems - order_id:', id);
    console.log('🔍 [CONTROLLER] sendOrderWithItems - items:', items);

    // Validazioni
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items deve essere un array non vuoto'
      });
    }

    // Prima aggiungi gli items
    const updatedOrder = await OrderService.addItemsToOrder(id, items, req.user, io);

    // Poi invia l'ordine
    const sentOrder = await OrderService.sendOrder(id, io);

    res.json({
      success: true,
      message: 'Prodotti aggiunti e ordine inviato',
      data: sentOrder
    });
  } catch (error) {
    console.error('❌ Errore in sendOrderWithItems:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  addItemsToOrder,
  sendOrderWithItems
};
