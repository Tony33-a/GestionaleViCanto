const db = require('../services/database');

/**
 * Model: Command
 * Gestisce le comande multiple per ordine
 * Ogni invio genera una nuova comanda
 */
class Command {
  static tableName = 'commands';

  /**
   * Trova comanda per ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const command = await db(this.tableName)
      .where({ id })
      .first();

    if (!command) return null;

    // Carica items associati
    const items = await db('order_items')
      .where('command_id', id)
      .orderBy('created_at', 'asc');

    return {
      ...command,
      items
    };
  }

  /**
   * Trova tutte le comande per ordine
   * @param {number} orderId
   * @returns {Promise<Array>}
   */
  static async findByOrderId(orderId) {
    const commands = await db(this.tableName)
      .where({ order_id: orderId })
      .orderBy('command_number', 'asc');

    // Carica items per ogni comanda
    for (const command of commands) {
      command.items = await db('order_items')
        .where('command_id', command.id)
        .orderBy('created_at', 'asc');
    }

    return commands;
  }

  /**
   * Crea nuova comanda per ordine
   * @param {number} orderId
   * @param {Array} itemIds - IDs degli items da associare
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async create(orderId, itemIds = [], trx = null) {
    const dbContext = trx || db;

    // Calcola numero comanda (incrementale per ordine)
    const lastCommand = await dbContext(this.tableName)
      .where({ order_id: orderId })
      .orderBy('command_number', 'desc')
      .first();

    const commandNumber = lastCommand ? lastCommand.command_number + 1 : 1;

    // Crea comanda
    const result = await dbContext(this.tableName)
      .insert({
        order_id: orderId,
        command_number: commandNumber,
        status: 'pending',
        print_status: 'pending',
        created_at: dbContext.fn.now()
      })
      .returning('*');

    const command = Array.isArray(result) ? result[0] : result;

    // Associa items alla comanda
    if (itemIds && itemIds.length > 0) {
      await dbContext('order_items')
        .whereIn('id', itemIds)
        .update({ command_id: command.id });
    }

    return command;
  }

  /**
   * Marca comanda come inviata
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async markSent(id, trx = null) {
    const dbContext = trx || db;

    const result = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'sent',
        sent_at: dbContext.fn.now()
      })
      .returning('*');

    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Marca comanda come stampata
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async markPrinted(id, trx = null) {
    const dbContext = trx || db;

    const result = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'printed',
        print_status: 'printed',
        printed_at: dbContext.fn.now()
      })
      .returning('*');

    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Marca comanda come fallita stampa
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async markPrintFailed(id, trx = null) {
    const dbContext = trx || db;

    const result = await dbContext(this.tableName)
      .where({ id })
      .update({
        status: 'print_failed',
        print_status: 'failed'
      })
      .returning('*');

    return Array.isArray(result) ? result[0] : result;
  }

  /**
   * Trova items non ancora associati a comanda per ordine
   * @param {number} orderId
   * @returns {Promise<Array>}
   */
  static async findUnsentItems(orderId) {
    return db('order_items')
      .where({ order_id: orderId })
      .whereNull('command_id')
      .orderBy('created_at', 'asc');
  }

  /**
   * Conta comande per ordine
   * @param {number} orderId
   * @returns {Promise<number>}
   */
  static async countByOrderId(orderId) {
    const result = await db(this.tableName)
      .where({ order_id: orderId })
      .count('id as count')
      .first();

    return parseInt(result.count) || 0;
  }
}

module.exports = Command;
