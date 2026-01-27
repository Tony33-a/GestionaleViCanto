/**
 * Queue Watcher - Monitora print_queue e processa stampe
 * Processo separato che gira in background
 */

const PrintQueue = require('../models/PrintQueue');
const Order = require('../models/Order');
const Command = require('../models/Command');
const PrintService = require('./PrintService');
const PdfPrintService = require('./PdfPrintService');
const io = require('socket.io-client');

class QueueWatcher {
  constructor(config = {}) {
    this.config = {
      pollInterval: config.pollInterval || 500, // Controlla ogni 500ms
      printerConfig: config.printerConfig || {},
      socketURL: config.socketURL || 'http://localhost:3000',
      authToken: config.authToken || null,
      mockMode: config.mockMode || false,
      pdfMode: config.pdfMode || false
    };

    // Usa PdfPrintService se in modalità PDF, altrimenti PrintService
    if (this.config.pdfMode) {
      this.printService = new PdfPrintService();
    } else {
      this.printService = new PrintService({
        ...this.config.printerConfig,
        mockMode: this.config.mockMode
      });
    }

    this.socket = null;
    this.isSocketConnected = false;  // Track real connection state
    this.isRunning = false;
    this.pollTimer = null;
    this.printerMonitorInterval = null;  // Per monitoring stampante
    this.lastPrinterState = null;  // Per tracking cambi stato
  }

  /**
   * Avvia il watcher
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️  QueueWatcher già in esecuzione');
      return;
    }

    console.log('🚀 Avvio QueueWatcher...');

    // Inizializza stampante
    const printerReady = await this.printService.initialize();
    if (!printerReady && !this.config.mockMode) {
      console.error('❌ Impossibile avviare: stampante non disponibile');
      throw new Error('Printer not available');
    }

    // Connetti Socket.IO (se token disponibile)
    if (this.config.authToken) {
      await this.connectSocket();
    } else {
      console.warn('⚠️  Socket.IO non connesso: nessun token fornito');
    }

    // Avvia polling
    this.isRunning = true;
    this.poll();

    // Avvia monitoring periodico stampante
    this.startPrinterMonitoring();

    console.log(`✅ QueueWatcher avviato (polling ogni ${this.config.pollInterval}ms)`);
  }

  /**
   * Connetti a Socket.IO server con AUTO-RECONNECTION
   */
  async connectSocket() {
    try {
      this.socket = io(this.config.socketURL, {
        auth: { token: this.config.authToken },
        reconnection: true,           // AUTO-RECONNECTION
        reconnectionDelay: 1000,      // Retry dopo 1s
        reconnectionAttempts: Infinity // Riprova all'infinito
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connesso per emit eventi stampa');
        this.isSocketConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️  Socket.IO disconnesso:', reason);
        this.isSocketConnected = false;

        // Se server ha chiuso, riconnetti manualmente
        if (reason === 'io server disconnect') {
          console.log('🔄 Riconnessione manuale...');
          this.socket.connect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket.IO riconnesso dopo ${attemptNumber} tentativi`);
        this.isSocketConnected = true;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Errore riconnessione Socket.IO:', error.message);
        this.isSocketConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Errore connessione Socket.IO:', error.message);
        this.isSocketConnected = false;
      });

    } catch (error) {
      console.error('❌ Errore setup Socket.IO:', error.message);
      this.isSocketConnected = false;
    }
  }

  /**
   * Avvia monitoring periodico stato stampante
   * Controlla ogni 30 secondi e notifica cambi stato
   */
  startPrinterMonitoring() {
    // Skip in mock mode
    if (this.config.mockMode) {
      return;
    }

    // Controlla stato stampante ogni 30 secondi
    this.printerMonitorInterval = setInterval(async () => {
      try {
        const isOnline = await this.printService.initialize();

        if (!isOnline && this.lastPrinterState !== false) {
          // Stampante appena andata OFFLINE
          console.error('🚨 ALERT: Stampante OFFLINE!');

          // Emit evento ai client
          if (this.socket && this.socket.connected && this.isSocketConnected) {
            try {
              this.socket.emit('printer:offline', {
                timestamp: new Date().toISOString(),
                message: 'Stampante non raggiungibile'
              });
            } catch (emitError) {
              console.error('❌ Failed to emit printer:offline:', emitError.message);
            }
          }

          this.lastPrinterState = false;
        } else if (isOnline && this.lastPrinterState === false) {
          // Stampante tornata ONLINE
          console.log('✅ Stampante tornata ONLINE');

          if (this.socket && this.socket.connected && this.isSocketConnected) {
            try {
              this.socket.emit('printer:online', {
                timestamp: new Date().toISOString()
              });
            } catch (emitError) {
              console.error('❌ Failed to emit printer:online:', emitError.message);
            }
          }

          this.lastPrinterState = true;
        }

      } catch (error) {
        console.error('❌ Errore monitoring stampante:', error.message);
      }
    }, 30000); // 30 secondi
  }

  /**
   * Polling della coda di stampa
   */
  async poll() {
    if (!this.isRunning) return;

    try {
      // Ottieni job pending dalla coda
      const pendingJobs = await PrintQueue.findPending();

      if (pendingJobs.length > 0) {
        console.log(`📋 ${pendingJobs.length} job in coda stampa`);

        // Processa ogni job
        for (const job of pendingJobs) {
          await this.processJob(job);
        }
      }

    } catch (error) {
      console.error('❌ Errore polling coda:', error.message);
    }

    // Prossimo poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Processa singolo job di stampa con OPTIMISTIC LOCKING
   * Previene duplicate prints da multiple istanze
   */
  async processJob(job) {
    try {
      console.log(`🖨️  Processando job #${job.id} (Ordine #${job.order_id}, tentativo ${job.attempts + 1}/${job.max_attempts})`);

      // ATOMIC LOCK: Set status to 'printing' BEFORE processing
      const lockedJob = await PrintQueue.setPrinting(job.id);

      if (!lockedJob) {
        // Job già preso da altra istanza o non più pending
        console.log(`⏭️  Job #${job.id} già in elaborazione da altra istanza, skip`);
        return;
      }

      // Ottieni ordine completo con items
      const order = await Order.findById(job.order_id);

      if (!order) {
        throw new Error(`Ordine #${job.order_id} non trovato`);
      }

      // Esegui stampa in base al tipo
      if (job.print_type === 'preconto') {
        // Stampa PRECONTO (chiusura tavolo)
        await this.printService.printOrder(order);
        console.log(`📄 Preconto stampato per ordine #${job.order_id}`);
      } else if (job.command_id) {
        // Stampa COMANDA singola (invio comanda)
        const command = await Command.findById(job.command_id);
        if (!command) {
          throw new Error(`Comanda #${job.command_id} non trovata per ordine #${job.order_id}`);
        }

        await this.printService.printCommand(order, command);

        try {
          await Command.markPrinted(job.command_id);
        } catch (markError) {
          console.warn(`⚠️  Impossibile marcare comanda #${job.command_id} come stampata: ${markError.message}`);
        }
      } else {
        // Fallback: stampa ordine completo
        await this.printService.printOrder(order);
      }

      // Marca come stampato
      await PrintQueue.markPrinted(job.id);

      console.log(`✅ Job #${job.id} completato (Ordine #${job.order_id})`);

      // Emit evento successo via Socket.IO
      if (this.socket && this.socket.connected && this.isSocketConnected) {
        try {
          const updatedJob = await PrintQueue.findById(job.id);
          this.socket.emit('print:success', updatedJob);
          console.log(`📤 Emitted print:success for Order #${job.order_id}`);
        } catch (emitError) {
          console.error(`❌ Failed to emit print:success:`, emitError.message);
          // Non bloccare il processo - job è stampato correttamente
        }
      } else {
        console.warn(`⚠️  Cannot emit print:success - Socket disconnected (Order #${job.order_id})`);
        // TODO: Salvare evento in queue per retry quando riconnette
      }

    } catch (error) {
      console.error(`❌ Errore stampa job #${job.id}:`, error.message);

      // Incrementa tentativi
      const updatedJob = await PrintQueue.incrementAttempts(
        job.id,
        error.message,
        error.stack
      );

      // Se ha raggiunto max attempts, emetti evento failed
      if (updatedJob.status === 'failed') {
        console.error(`❌ Job #${job.id} FALLITO dopo ${updatedJob.attempts} tentativi`);

        // Emit evento fallimento via Socket.IO
        if (this.socket && this.socket.connected && this.isSocketConnected) {
          try {
            this.socket.emit('print:failed', updatedJob);
            console.log(`📤 Emitted print:failed for Order #${job.order_id}`);
          } catch (emitError) {
            console.error(`❌ Failed to emit print:failed:`, emitError.message);
          }
        } else {
          console.warn(`⚠️  Cannot emit print:failed - Socket disconnected (Order #${job.order_id})`);
        }
      } else {
        console.warn(`⚠️  Job #${job.id} riproverà (tentativo ${updatedJob.attempts}/${updatedJob.max_attempts})`);
      }
    }
  }

  /**
   * Ferma il watcher
   */
  async stop() {
    if (!this.isRunning) {
      console.warn('⚠️  QueueWatcher già fermo');
      return;
    }

    console.log('🛑 Arresto QueueWatcher...');

    this.isRunning = false;

    // Ferma polling
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Ferma monitoring stampante
    if (this.printerMonitorInterval) {
      clearInterval(this.printerMonitorInterval);
      this.printerMonitorInterval = null;
    }

    // Chiudi stampante
    await this.printService.close();

    // Disconnetti Socket.IO
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('✅ QueueWatcher arrestato');
  }

  /**
   * Gestisci segnali di terminazione (Ctrl+C, kill)
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📡 Ricevuto ${signal}, arresto graceful...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Gestisci errori non catturati
    process.on('uncaughtException', async (error) => {
      console.error('❌ UNCAUGHT EXCEPTION:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('❌ UNHANDLED REJECTION:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}

module.exports = QueueWatcher;
