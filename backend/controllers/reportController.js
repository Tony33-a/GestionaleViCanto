const db = require('../services/database');

/**
 * Dashboard generale - Statistiche con filtri
 * GET /api/reports/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
const getDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date();
    const endDate = to ? new Date(to) : new Date();

    if (!from) startDate.setHours(0, 0, 0, 0);
    if (!to) endDate.setHours(23, 59, 59, 999);
    if (to) endDate.setDate(endDate.getDate() + 1);

    // KPI ordini completati (snapshot)
    const totals = await db('sales_orders')
      .where('closed_at', '>=', startDate)
      .where('closed_at', '<', endDate)
      .count('id as count')
      .sum('total as total')
      .sum('covers as covers')
      .first();

    // Tavoli chiusi nel periodo
    const tablesClosed = await db('sales_orders')
      .where('closed_at', '>=', startDate)
      .where('closed_at', '<', endDate)
      .count('id as count')
      .first();

    // Prodotti più venduti (pie chart)
    const topProducts = await db('sales_items')
      .join('sales_orders', 'sales_items.sales_order_id', 'sales_orders.id')
      .where('sales_orders.closed_at', '>=', startDate)
      .where('sales_orders.closed_at', '<', endDate)
      .select('sales_items.product_name')
      .sum('sales_items.quantity as total_quantity')
      .sum('sales_items.total_price as total_revenue')
      .groupBy('sales_items.product_name')
      .orderBy('total_quantity', 'desc')
      .limit(10);

    // Incassi giornalieri (histogram)
    const revenueByDay = await db('sales_orders')
      .where('closed_at', '>=', startDate)
      .where('closed_at', '<', endDate)
      .select(db.raw('DATE(closed_at) as date'))
      .sum('total as revenue')
      .count('id as orders')
      .groupBy(db.raw('DATE(closed_at)'))
      .orderBy('date');

    const ordersCount = parseInt(totals.count) || 0;
    const closedTablesCount = parseInt(tablesClosed.count) || 0;
    const totalRevenue = parseFloat(totals.total) || 0;

    res.json({
      success: true,
      data: {
        range: {
          from: startDate.toISOString().split('T')[0],
          to: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
        },
        orders: {
          total: ordersCount,
          revenue: totalRevenue,
          average_ticket: closedTablesCount > 0
            ? Math.round((totalRevenue / closedTablesCount) * 100) / 100
            : 0
        },
        tables: {
          closed: closedTablesCount
        },
        top_products: topProducts.map(p => ({
          product: p.product_name,
          quantity: parseInt(p.total_quantity) || 0,
          revenue: parseFloat(p.total_revenue) || 0
        })),
        revenue_by_day: revenueByDay.map(d => ({
          date: d.date,
          revenue: parseFloat(d.revenue) || 0,
          orders: parseInt(d.orders) || 0
        }))
      }
    });
  } catch (error) {
    console.error('❌ [REPORT] Errore dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero dashboard'
    });
  }
};

/**
 * Storico ordini con filtri
 * GET /api/reports/orders?from=YYYY-MM-DD&to=YYYY-MM-DD&status=completed
 */
const getOrdersHistory = async (req, res) => {
  try {
    const { from, to, status, limit = 50, offset = 0 } = req.query;

    let query = db('orders')
      .select(
        'orders.*',
        'tables.number as table_number',
        'users.username as waiter_username'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .orderBy('orders.created_at', 'desc');

    if (from) {
      query = query.where('orders.created_at', '>=', from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      query = query.where('orders.created_at', '<', toDate);
    }
    if (status) {
      query = query.where('orders.status', status);
    }

    const orders = await query.limit(parseInt(limit)).offset(parseInt(offset));

    // Conta totale per paginazione
    let countQuery = db('orders').count('id as count');
    if (from) countQuery = countQuery.where('created_at', '>=', from);
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      countQuery = countQuery.where('created_at', '<', toDate);
    }
    if (status) countQuery = countQuery.where('status', status);
    
    const totalCount = await countQuery.first();

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: parseInt(totalCount.count) || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('❌ [REPORT] Errore storico ordini:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero storico ordini'
    });
  }
};

/**
 * Report giornaliero
 * GET /api/reports/daily?date=YYYY-MM-DD
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Totali giornalieri
    const totals = await db('orders')
      .where('created_at', '>=', reportDate)
      .where('created_at', '<', nextDay)
      .where('status', 'completed')
      .count('id as orders_count')
      .sum('total as revenue')
      .sum('covers as covers_count')
      .first();

    // Vendite per categoria
    const byCategory = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .where('orders.created_at', '>=', reportDate)
      .where('orders.created_at', '<', nextDay)
      .where('orders.status', 'completed')
      .select('order_items.category')
      .sum(db.raw('order_items.quantity * order_items.unit_price as total'))
      .sum('order_items.quantity as quantity')
      .groupBy('order_items.category')
      .orderBy('total', 'desc');

    // Vendite per prodotto
    const byProduct = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .where('orders.created_at', '>=', reportDate)
      .where('orders.created_at', '<', nextDay)
      .where('orders.status', 'completed')
      .select('order_items.product_name', 'order_items.category')
      .sum(db.raw('order_items.quantity * order_items.unit_price as total'))
      .sum('order_items.quantity as quantity')
      .groupBy('order_items.product_name', 'order_items.category')
      .orderBy('quantity', 'desc')
      .limit(20);

    // Ordini per ora
    const byHour = await db('orders')
      .where('created_at', '>=', reportDate)
      .where('created_at', '<', nextDay)
      .where('status', 'completed')
      .select(db.raw('EXTRACT(HOUR FROM created_at) as hour'))
      .count('id as orders')
      .sum('total as revenue')
      .groupBy(db.raw('EXTRACT(HOUR FROM created_at)'))
      .orderBy('hour');

    res.json({
      success: true,
      data: {
        date: reportDate.toISOString().split('T')[0],
        totals: {
          orders: parseInt(totals.orders_count) || 0,
          revenue: parseFloat(totals.revenue) || 0,
          covers: parseInt(totals.covers_count) || 0,
          average_ticket: totals.orders_count > 0 
            ? Math.round((parseFloat(totals.revenue) / parseInt(totals.orders_count)) * 100) / 100 
            : 0
        },
        by_category: byCategory.map(c => ({
          category: c.category || 'Altro',
          total: parseFloat(c.total) || 0,
          quantity: parseInt(c.quantity) || 0
        })),
        by_product: byProduct.map(p => ({
          product: p.product_name,
          category: p.category || 'Altro',
          total: parseFloat(p.total) || 0,
          quantity: parseInt(p.quantity) || 0
        })),
        by_hour: byHour.map(h => ({
          hour: parseInt(h.hour),
          orders: parseInt(h.orders) || 0,
          revenue: parseFloat(h.revenue) || 0
        }))
      }
    });
  } catch (error) {
    console.error('❌ [REPORT] Errore report giornaliero:', error);
    res.status(500).json({
      success: false,
      error: 'Errore generazione report giornaliero'
    });
  }
};

/**
 * Report settimanale
 * GET /api/reports/weekly?week=YYYY-Www (es: 2026-W03)
 */
const getWeeklyReport = async (req, res) => {
  try {
    const { week } = req.query;
    
    // Calcola date settimana
    let startDate, endDate;
    if (week) {
      const [year, weekNum] = week.split('-W');
      startDate = getDateOfISOWeek(parseInt(weekNum), parseInt(year));
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Lunedì
    }
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Totali settimanali
    const totals = await db('orders')
      .where('created_at', '>=', startDate)
      .where('created_at', '<', endDate)
      .where('status', 'completed')
      .count('id as orders_count')
      .sum('total as revenue')
      .sum('covers as covers_count')
      .first();

    // Vendite per giorno
    const byDay = await db('orders')
      .where('created_at', '>=', startDate)
      .where('created_at', '<', endDate)
      .where('status', 'completed')
      .select(db.raw('DATE(created_at) as date'))
      .count('id as orders')
      .sum('total as revenue')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    res.json({
      success: true,
      data: {
        week: `${startDate.getFullYear()}-W${getWeekNumber(startDate).toString().padStart(2, '0')}`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        totals: {
          orders: parseInt(totals.orders_count) || 0,
          revenue: parseFloat(totals.revenue) || 0,
          covers: parseInt(totals.covers_count) || 0
        },
        by_day: byDay.map(d => ({
          date: d.date,
          orders: parseInt(d.orders) || 0,
          revenue: parseFloat(d.revenue) || 0
        }))
      }
    });
  } catch (error) {
    console.error('❌ [REPORT] Errore report settimanale:', error);
    res.status(500).json({
      success: false,
      error: 'Errore generazione report settimanale'
    });
  }
};

/**
 * Report mensile
 * GET /api/reports/monthly?month=YYYY-MM
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query;
    
    let startDate;
    if (month) {
      const [year, monthNum] = month.split('-');
      startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    } else {
      startDate = new Date();
      startDate.setDate(1);
    }
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Totali mensili
    const totals = await db('orders')
      .where('created_at', '>=', startDate)
      .where('created_at', '<', endDate)
      .where('status', 'completed')
      .count('id as orders_count')
      .sum('total as revenue')
      .sum('covers as covers_count')
      .first();

    // Vendite per settimana
    const byWeek = await db('orders')
      .where('created_at', '>=', startDate)
      .where('created_at', '<', endDate)
      .where('status', 'completed')
      .select(db.raw('EXTRACT(WEEK FROM created_at) as week'))
      .count('id as orders')
      .sum('total as revenue')
      .groupBy(db.raw('EXTRACT(WEEK FROM created_at)'))
      .orderBy('week');

    // Top prodotti del mese
    const topProducts = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .where('orders.created_at', '>=', startDate)
      .where('orders.created_at', '<', endDate)
      .where('orders.status', 'completed')
      .select('order_items.product_name')
      .sum('order_items.quantity as quantity')
      .sum(db.raw('order_items.quantity * order_items.unit_price as revenue'))
      .groupBy('order_items.product_name')
      .orderBy('quantity', 'desc')
      .limit(10);

    res.json({
      success: true,
      data: {
        month: `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`,
        totals: {
          orders: parseInt(totals.orders_count) || 0,
          revenue: parseFloat(totals.revenue) || 0,
          covers: parseInt(totals.covers_count) || 0,
          average_daily: Math.round((parseFloat(totals.revenue) / getDaysInMonth(startDate)) * 100) / 100
        },
        by_week: byWeek.map(w => ({
          week: parseInt(w.week),
          orders: parseInt(w.orders) || 0,
          revenue: parseFloat(w.revenue) || 0
        })),
        top_products: topProducts.map(p => ({
          product: p.product_name,
          quantity: parseInt(p.quantity) || 0,
          revenue: parseFloat(p.revenue) || 0
        }))
      }
    });
  } catch (error) {
    console.error('❌ [REPORT] Errore report mensile:', error);
    res.status(500).json({
      success: false,
      error: 'Errore generazione report mensile'
    });
  }
};

// Helper functions
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDateOfISOWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

module.exports = {
  getDashboard,
  getOrdersHistory,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport
};
