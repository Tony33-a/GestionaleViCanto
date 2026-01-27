const OrderService = require('../services/orderService');
const Order = require('../models/Order');

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
    console.log('🔍 [CONTROLLER] createOrder - req.body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [CONTROLLER] createOrder - req.user:', req.user);
    
    const orderData = req.body;
    const io = req.app.get('io');

    console.log('🔍 [CONTROLLER] createOrder - chiamando OrderService.createOrder');
    // Usa OrderService per business logic centralizzata
    const completeOrder = await OrderService.createOrder(orderData, req.user, io);

    res.status(201).json({
      success: true,
      message: 'Ordine creato',
      data: completeOrder
    });
  } catch (error) {
    console.error('❌ Errore in createOrder:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Send order (change status to sent + add to print queue)
 * PUT /api/orders/:id/send
 */
const sendOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');

    // Usa OrderService per business logic centralizzata
    const updatedOrder = await OrderService.sendOrder(id, io);

    res.json({
      success: true,
      message: 'Ordine inviato e inserito in coda stampa',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ Errore in sendOrder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Complete order
 * PUT /api/orders/:id/complete
 */
const completeOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');

    // Usa OrderService per business logic centralizzata
    const updatedOrder = await OrderService.completeOrder(id, io);

    res.json({
      success: true,
      message: 'Ordine completato e tavolo liberato',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ Errore in completeOrder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel order
 * PUT /api/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');

    // Usa OrderService per business logic centralizzata
    const updatedOrder = await OrderService.cancelOrder(id, io);

    res.json({
      success: true,
      message: 'Ordine cancellato',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ Errore in cancelOrder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update order (items, covers)
 * PUT /api/orders/:id
 */
const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Usa OrderService per business logic centralizzata
    const updatedOrder = await OrderService.updateOrder(id, updateData);

    res.json({
      success: true,
      message: 'Ordine aggiornato',
      data: updatedOrder
    });
  } catch (error) {
    console.error('❌ Errore in updateOrder:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  getActiveOrders,
  getOrderById,
  createOrder,
  sendOrder,
  completeOrder,
  cancelOrder,
  updateOrder
};
