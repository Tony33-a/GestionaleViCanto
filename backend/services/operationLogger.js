const db = require('./database');

/**
 * Servizio Logging Operazioni Critiche
 * Log persistente secondo specifiche gelateria
 */
class OperationLogger {
  static tableName = 'operation_logs';

  /**
   * Log generico
   * @param {string} operation - Tipo operazione
   * @param {Object} data - Dati operazione
   */
  static async log(operation, data = {}) {
    try {
      const logEntry = {
        operation,
        user_id: data.userId || null,
        table_id: data.tableId || null,
        order_id: data.orderId || null,
        details: data.details ? JSON.stringify(data.details) : null,
        error_message: data.errorMessage || null,
        error_stack: data.errorStack || null,
        ip_address: data.ipAddress || null,
        created_at: db.fn.now()
      };

      await db(this.tableName).insert(logEntry);
      
      console.log(`📋 [LOG] ${operation}:`, {
        userId: data.userId,
        tableId: data.tableId,
        orderId: data.orderId
      });
    } catch (error) {
      console.error('❌ [LOG] Errore scrittura log:', error.message);
    }
  }

  /**
   * Log apertura tavolo
   */
  static async logTableOpen(userId, tableId, tableNumber, covers, ipAddress = null) {
    await this.log('table_open', {
      userId,
      tableId,
      details: { table_number: tableNumber, covers },
      ipAddress
    });
  }

  /**
   * Log invio comanda
   */
  static async logOrderSend(userId, orderId, tableId, commandNumber, itemsCount, ipAddress = null) {
    await this.log('order_send', {
      userId,
      orderId,
      tableId,
      details: { command_number: commandNumber, items_count: itemsCount },
      ipAddress
    });
  }

  /**
   * Log completamento ordine
   */
  static async logOrderComplete(userId, orderId, tableId, total, ipAddress = null) {
    await this.log('order_complete', {
      userId,
      orderId,
      tableId,
      details: { total },
      ipAddress
    });
  }

  /**
   * Log annullamento ordine
   */
  static async logOrderCancel(userId, orderId, tableId, reason = null, ipAddress = null) {
    await this.log('order_cancel', {
      userId,
      orderId,
      tableId,
      details: { reason },
      ipAddress
    });
  }

  /**
   * Log liberazione tavolo
   */
  static async logTableFree(userId, tableId, tableNumber, totalRevenue, ipAddress = null) {
    await this.log('table_free', {
      userId,
      tableId,
      details: { table_number: tableNumber, total_revenue: totalRevenue },
      ipAddress
    });
  }

  /**
   * Log stampa riuscita
   */
  static async logPrintSuccess(orderId, printType, printJobId) {
    await this.log('print_success', {
      orderId,
      details: { print_type: printType, print_job_id: printJobId }
    });
  }

  /**
   * Log errore stampa
   */
  static async logPrintFailed(orderId, printType, errorMessage, errorStack = null) {
    await this.log('print_failed', {
      orderId,
      errorMessage,
      errorStack,
      details: { print_type: printType }
    });
  }

  /**
   * Log login utente
   */
  static async logLogin(userId, username, ipAddress = null) {
    await this.log('login', {
      userId,
      details: { username },
      ipAddress
    });
  }

  /**
   * Recupera log con filtri
   * @param {Object} filters - Filtri ricerca
   */
  static async getLogs(filters = {}) {
    let query = db(this.tableName)
      .select(
        'operation_logs.*',
        'users.username',
        'tables.number as table_number'
      )
      .leftJoin('users', 'operation_logs.user_id', 'users.id')
      .leftJoin('tables', 'operation_logs.table_id', 'tables.id')
      .orderBy('operation_logs.created_at', 'desc');

    if (filters.operation) {
      query = query.where('operation_logs.operation', filters.operation);
    }
    if (filters.userId) {
      query = query.where('operation_logs.user_id', filters.userId);
    }
    if (filters.from) {
      query = query.where('operation_logs.created_at', '>=', filters.from);
    }
    if (filters.to) {
      query = query.where('operation_logs.created_at', '<=', filters.to);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  /**
   * Recupera errori recenti (per notifiche admin)
   */
  static async getRecentErrors(limit = 10) {
    return db(this.tableName)
      .whereIn('operation', ['print_failed', 'order_cancel'])
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  /**
   * Conta errori oggi (per dashboard)
   */
  static async countTodayErrors() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db(this.tableName)
      .whereIn('operation', ['print_failed'])
      .where('created_at', '>=', today)
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }
}

module.exports = OperationLogger;
