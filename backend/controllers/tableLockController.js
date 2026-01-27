const Table = require('../models/Table');

/**
 * Blocca tavolo per utente
 * POST /api/tables/:id/lock
 */
const lockTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(`🔒 [LOCK] Tentativo blocco tavolo ${id} da utente ${userId}`);

    const lockedTable = await Table.lock(parseInt(id), userId);

    if (!lockedTable) {
      // Recupera info su chi ha bloccato il tavolo
      const lockInfo = await Table.getLockInfo(parseInt(id));
      
      return res.status(409).json({
        success: false,
        error: 'Tavolo attualmente in uso',
        message: 'Il tavolo è già bloccato da un altro utente',
        locked_by: lockInfo?.locked_by,
        locked_at: lockInfo?.locked_at
      });
    }

    console.log(`✅ [LOCK] Tavolo ${id} bloccato con successo da utente ${userId}`);

    res.json({
      success: true,
      message: 'Tavolo bloccato con successo',
      data: lockedTable
    });
  } catch (error) {
    console.error('❌ [LOCK] Errore blocco tavolo:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Sblocca tavolo
 * POST /api/tables/:id/unlock
 */
const unlockTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log(`🔓 [LOCK] Tentativo sblocco tavolo ${id} da utente ${userId}`);

    const unlocked = await Table.unlock(parseInt(id), userId);

    if (!unlocked) {
      return res.status(403).json({
        success: false,
        error: 'Non puoi sbloccare questo tavolo',
        message: 'Solo l\'utente che ha bloccato il tavolo può sbloccarlo'
      });
    }

    console.log(`✅ [LOCK] Tavolo ${id} sbloccato con successo da utente ${userId}`);

    res.json({
      success: true,
      message: 'Tavolo sbloccato con successo'
    });
  } catch (error) {
    console.error('❌ [LOCK] Errore sblocco tavolo:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Verifica stato lock tavolo
 * GET /api/tables/:id/lock-status
 */
const getLockStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lockInfo = await Table.getLockInfo(parseInt(id));

    res.json({
      success: true,
      data: {
        table_id: parseInt(id),
        is_locked: !!lockInfo,
        lock_info: lockInfo
      }
    });
  } catch (error) {
    console.error('❌ [LOCK] Errore verifica lock:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pulisci lock expired (solo admin)
 * POST /api/tables/cleanup-locks
 */
const cleanupExpiredLocks = async (req, res, next) => {
  try {
    // Solo admin può eseguire cleanup
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accesso negato - solo admin può eseguire cleanup'
      });
    }

    const cleanedCount = await Table.cleanupExpiredLocks();

    console.log(`🧹 [LOCK] Cleanup completato: ${cleanedCount} lock rimossi`);

    res.json({
      success: true,
      message: `Cleanup completato: ${cleanedCount} lock rimossi`,
      cleaned_count: cleanedCount
    });
  } catch (error) {
    console.error('❌ [LOCK] Errore cleanup:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  lockTable,
  unlockTable,
  getLockStatus,
  cleanupExpiredLocks
};
