/**
 * Printer Controller - Gestione diagnostica stampante
 */

const PrintQueue = require('../models/PrintQueue');
const db = require('../services/database');

/**
 * GET /api/printer/status
 * Ottiene stato stampante e statistiche coda
 */
exports.getStatus = async (req, res) => {
  try {
    // Statistiche coda stampa
    const stats = await db('print_queue')
      .select(db.raw(`
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'printing') as printing_count,
        COUNT(*) FILTER (WHERE status = 'printed') as printed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) as total_count
      `))
      .first();

    // Ultimo job stampato
    const lastPrinted = await db('print_queue')
      .where('status', 'printed')
      .orderBy('printed_at', 'desc')
      .first();

    // Ultimo errore
    const lastError = await db('print_queue')
      .where('status', 'failed')
      .orderBy('updated_at', 'desc')
      .first();

    // Job in corso
    const currentJob = await db('print_queue')
      .where('status', 'printing')
      .first();

    // Statistiche giornaliere
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await db('print_queue')
      .where('created_at', '>=', today)
      .select(db.raw(`
        COUNT(*) FILTER (WHERE status = 'printed') as printed_today,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_today
      `))
      .first();

    // Determina stato stampante
    let printerStatus = 'unknown';
    let printerMessage = 'Stato sconosciuto';

    if (parseInt(stats.failed_count) > 0 && parseInt(stats.pending_count) === 0) {
      printerStatus = 'warning';
      printerMessage = `${stats.failed_count} stampe fallite`;
    } else if (parseInt(stats.printing_count) > 0) {
      printerStatus = 'busy';
      printerMessage = 'Stampa in corso...';
    } else if (parseInt(stats.pending_count) > 0) {
      printerStatus = 'busy';
      printerMessage = `${stats.pending_count} stampe in coda`;
    } else if (lastPrinted) {
      printerStatus = 'online';
      printerMessage = 'Stampante pronta';
    } else {
      printerStatus = 'idle';
      printerMessage = 'Nessuna stampa recente';
    }

    res.json({
      success: true,
      data: {
        status: printerStatus,
        message: printerMessage,
        queue: {
          pending: parseInt(stats.pending_count) || 0,
          printing: parseInt(stats.printing_count) || 0,
          printed: parseInt(stats.printed_count) || 0,
          failed: parseInt(stats.failed_count) || 0,
          total: parseInt(stats.total_count) || 0
        },
        today: {
          printed: parseInt(todayStats?.printed_today) || 0,
          failed: parseInt(todayStats?.failed_today) || 0
        },
        lastPrinted: lastPrinted ? {
          id: lastPrinted.id,
          orderId: lastPrinted.order_id,
          printedAt: lastPrinted.printed_at
        } : null,
        lastError: lastError ? {
          id: lastError.id,
          orderId: lastError.order_id,
          error: lastError.error_message,
          attempts: lastError.attempts,
          updatedAt: lastError.updated_at
        } : null,
        currentJob: currentJob ? {
          id: currentJob.id,
          orderId: currentJob.order_id,
          createdAt: currentJob.created_at
        } : null
      }
    });

  } catch (error) {
    console.error('Errore getStatus stampante:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero stato stampante'
    });
  }
};

/**
 * GET /api/printer/queue
 * Ottiene coda stampe dettagliata con filtri
 */
exports.getQueue = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = db('print_queue')
      .select(
        'print_queue.*',
        'orders.table_id',
        'tables.number as table_number'
      )
      .leftJoin('orders', 'print_queue.order_id', 'orders.id')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .orderBy('print_queue.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (status) {
      query = query.where('print_queue.status', status);
    }

    const jobs = await query;

    // Conta totali per paginazione
    let countQuery = db('print_queue').count('* as count');
    if (status) {
      countQuery = countQuery.where('status', status);
    }
    const countResult = await countQuery.first();

    res.json({
      success: true,
      data: {
        jobs: jobs.map(job => ({
          id: job.id,
          orderId: job.order_id,
          tableNumber: job.table_number,
          printType: job.print_type || 'comanda',
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.max_attempts,
          errorMessage: job.error_message,
          createdAt: job.created_at,
          printedAt: job.printed_at,
          updatedAt: job.updated_at
        })),
        pagination: {
          total: parseInt(countResult.count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('Errore getQueue stampante:', error);
    res.status(500).json({
      success: false,
      error: 'Errore recupero coda stampe'
    });
  }
};

/**
 * POST /api/printer/test
 * Esegue stampa di test
 */
exports.testPrint = async (req, res) => {
  try {
    // Crea job di test nella coda
    const [testJob] = await db('print_queue')
      .insert({
        order_id: null, // Nessun ordine associato
        print_type: 'test',
        status: 'pending',
        attempts: 0,
        max_attempts: 1,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.json({
      success: true,
      message: 'Stampa di test inviata alla coda',
      data: {
        jobId: testJob.id,
        status: testJob.status
      }
    });

  } catch (error) {
    console.error('Errore testPrint:', error);
    res.status(500).json({
      success: false,
      error: 'Errore invio stampa di test'
    });
  }
};

/**
 * POST /api/printer/retry/:jobId
 * Riprova stampa fallita
 */
exports.retryJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verifica che il job esista e sia fallito
    const job = await db('print_queue').where('id', jobId).first();

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job non trovato'
      });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Solo i job falliti possono essere riprovati'
      });
    }

    // Reset del job per riprocessarlo
    const [updatedJob] = await db('print_queue')
      .where('id', jobId)
      .update({
        status: 'pending',
        attempts: 0,
        error_message: null,
        error_stack: null,
        updated_at: new Date()
      })
      .returning('*');

    res.json({
      success: true,
      message: 'Job rimesso in coda',
      data: {
        jobId: updatedJob.id,
        status: updatedJob.status
      }
    });

  } catch (error) {
    console.error('Errore retryJob:', error);
    res.status(500).json({
      success: false,
      error: 'Errore retry job'
    });
  }
};

/**
 * DELETE /api/printer/queue/:jobId
 * Cancella job dalla coda
 */
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await db('print_queue').where('id', jobId).first();

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job non trovato'
      });
    }

    // Non permettere cancellazione di job in corso
    if (job.status === 'printing') {
      return res.status(400).json({
        success: false,
        error: 'Impossibile cancellare job in corso'
      });
    }

    await db('print_queue').where('id', jobId).del();

    res.json({
      success: true,
      message: 'Job cancellato'
    });

  } catch (error) {
    console.error('Errore deleteJob:', error);
    res.status(500).json({
      success: false,
      error: 'Errore cancellazione job'
    });
  }
};

/**
 * POST /api/printer/clear-failed
 * Pulisce tutti i job falliti
 */
exports.clearFailed = async (req, res) => {
  try {
    const deleted = await db('print_queue')
      .where('status', 'failed')
      .del();

    res.json({
      success: true,
      message: `${deleted} job falliti rimossi`,
      data: {
        deletedCount: deleted
      }
    });

  } catch (error) {
    console.error('Errore clearFailed:', error);
    res.status(500).json({
      success: false,
      error: 'Errore pulizia job falliti'
    });
  }
};
