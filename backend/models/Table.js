const db = require('../services/database');

/**
 * Model: Table
 * Gestisce i tavoli della gelateria con lock concorrente
 * Stati: free, pending, occupied
 */
class Table {
  static tableName = 'tables';

  /**
   * Trova tutti i tavoli
   * @returns {Promise<Array>}
   */
  static async findAll() {
    return db(this.tableName)
      .select('*')
      .orderBy('number', 'asc');
  }

  /**
   * Trova tavolo per ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    return db(this.tableName)
      .where({ id })
      .first();
  }

  /**
   * Blocca tavolo per utente (lock concorrente)
   * @param {number} tableId - ID tavolo
   * @param {number} userId - ID utente che blocca
   * @returns {Promise<Object|null>} - Tavolo bloccato o null se già bloccato
   */
  static async lock(tableId, userId) {
    const trx = await db.transaction();
    
    try {
      // Verifica se il tavolo è già bloccato da altro utente
      const table = await trx(this.tableName)
        .where({ id: tableId })
        .first();

      if (!table) {
        await trx.rollback();
        throw new Error('Tavolo non trovato');
      }

      // Se già bloccato da altro utente, fallisci
      if (table.locked_by && table.locked_by !== userId) {
        await trx.rollback();
        return null; // Tavolo già bloccato da altro utente
      }

      // Se bloccato dallo stesso utente, aggiorna timestamp
      if (table.locked_by === userId) {
        const updatedTable = await trx(this.tableName)
          .where({ id: tableId })
          .update({
            locked_at: db.fn.now()
          })
          .returning('*');

        await trx.commit();
        return updatedTable[0];
      }

      // Altrimenti blocca il tavolo
      const lockedTable = await trx(this.tableName)
        .where({ id: tableId })
        .update({
          locked_by: userId,
          locked_at: db.fn.now()
        })
        .returning('*');

      await trx.commit();
      return lockedTable[0];
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Sblocca tavolo
   * @param {number} tableId - ID tavolo
   * @param {number} userId - ID utente che sblocca (verifica proprietà)
   * @returns {Promise<boolean>} - True se sbloccato con successo
   */
  static async unlock(tableId, userId) {
    const trx = await db.transaction();
    
    try {
      const table = await trx(this.tableName)
        .where({ id: tableId })
        .first();

      if (!table) {
        await trx.rollback();
        throw new Error('Tavolo non trovato');
      }

      // Solo il proprietario del lock può sbloccare
      if (table.locked_by && table.locked_by !== userId) {
        await trx.rollback();
        return false;
      }

      await trx(this.tableName)
        .where({ id: tableId })
        .update({
          locked_by: null,
          locked_at: null
        });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Forza sblocco tavolo (per liberazione completa)
   * Sblocca indipendentemente da chi possiede il lock
   * @param {number} tableId - ID tavolo
   * @returns {Promise<boolean>} - True se sbloccato con successo
   */
  static async forceUnlock(tableId) {
    await db(this.tableName)
      .where({ id: tableId })
      .update({
        locked_by: null,
        locked_at: null
      });
    
    console.log(`🔓 [TABLE] Tavolo ${tableId} sbloccato forzatamente`);
    return true;
  }

  /**
   * Verifica se tavolo è bloccato e da chi
   * @param {number} tableId - ID tavolo
   * @returns {Promise<Object|null>} - Info lock o null
   */
  static async getLockInfo(tableId) {
    const table = await db(this.tableName)
      .where({ id: tableId })
      .select('locked_by', 'locked_at')
      .first();

    if (!table || !table.locked_by) {
      return null;
    }

    return {
      locked_by: table.locked_by,
      locked_at: table.locked_at
    };
  }

  /**
   * Pulisci lock expired (più di 30 minuti)
   * @returns {Promise<number>} - Numero di lock puliti
   */
  static async cleanupExpiredLocks() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const result = await db(this.tableName)
      .where('locked_at', '<', thirtyMinutesAgo)
      .update({
        locked_by: null,
        locked_at: null
      });

    return result;
  }

  /**
   * Trova tavolo per numero
   * @param {number} number
   * @returns {Promise<Object|null>}
   */
  static async findByNumber(number) {
    return db(this.tableName)
      .where({ number })
      .first();
  }

  /**
   * Trova tavolo con ordine corrente (se esiste)
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findByIdWithOrder(id) {
    const table = await this.findById(id);
    if (!table) return null;

    // Se tavolo è pending o occupied, carica l'ordine attivo
    if (table.status === 'pending' || table.status === 'occupied') {
      const order = await db('orders')
        .where({ table_id: id })
        .whereIn('status', ['pending', 'sent'])
        .orderBy('created_at', 'desc')
        .first();

      if (order) {
        // Carica anche gli items dell'ordine
        const rawItems = await db('order_items')
          .where({ order_id: order.id })
          .orderBy('course', 'asc')
          .orderBy('created_at', 'asc');

        // Mappa items con alias per frontend
        const items = rawItems.map(item => ({
          ...item,
          category_code: item.category, // Alias per frontend
          flavors: Array.isArray(item.flavors) ? item.flavors : 
                   (typeof item.flavors === 'string' ? JSON.parse(item.flavors) : []),
          supplements: Array.isArray(item.supplements) ? item.supplements : 
                      (typeof item.supplements === 'string' ? JSON.parse(item.supplements) : [])
        }));

        table.current_order = {
          ...order,
          items
        };
      }
    }

    return table;
  }

  /**
   * Aggiorna stato tavolo
   * @param {number} id
   * @param {Object} data - { status, covers, total }
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async update(id, data, trx = null) {
    const dbContext = trx || db;

    const [table] = await dbContext(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: dbContext.fn.now()
      })
      .returning('*');

    return table;
  }

  /**
   * Libera tavolo (reset a free)
   * @param {number} id
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async free(id, trx = null) {
    return this.update(id, {
      status: 'free',
      covers: 0,
      total: 0.00
    }, trx);
  }

  /**
   * Imposta tavolo come pending
   * @param {number} id
   * @param {number} covers
   * @param {number} total
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async setPending(id, covers, total, trx = null) {
    return this.update(id, {
      status: 'pending',
      covers,
      total
    }, trx);
  }

  /**
   * Imposta tavolo come occupied
   * @param {number} id
   * @param {number} covers
   * @param {number} total
   * @param {Object} trx - Transazione Knex (opzionale)
   * @returns {Promise<Object>}
   */
  static async setOccupied(id, covers, total, trx = null) {
    return this.update(id, {
      status: 'occupied',
      covers,
      total
    }, trx);
  }

  /**
   * Trova tutti i tavoli liberi
   * @returns {Promise<Array>}
   */
  static async findFree() {
    return db(this.tableName)
      .where({ status: 'free' })
      .orderBy('number', 'asc');
  }

  /**
   * Trova tutti i tavoli occupati
   * @returns {Promise<Array>}
   */
  static async findOccupied() {
    return db(this.tableName)
      .where({ status: 'occupied' })
      .orderBy('number', 'asc');
  }
}

module.exports = Table;
