/**
 * Print Service - Gestione Stampante Termica WiFi
 * Stampa ricevute ordini utilizzando protocollo ESC/POS
 */

const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
const db = require('../config/database');

class PrintService {
  constructor(config = {}) {
    this.config = {
      type: config.type || PrinterTypes.EPSON, // Default EPSON (compatibile con la maggior parte)
      interface: config.interface || 'tcp://192.168.1.100', // IP stampante WiFi (da configurare)
      characterSet: CharacterSet.PC850_MULTILINGUAL,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      options: {
        timeout: 5000 // 5 secondi timeout
      },
      ...config
    };

    this.printer = null;
    this.mockMode = config.mockMode || false; // Per testing senza stampante fisica
  }

  /**
   * Stampa singola COMANDA (ticket) per un ordine
   * @param {Object} order - Ordine completo
   * @param {Object} command - Comanda con items associati
   * @returns {Promise<boolean>}
   */
  async printCommand(order, command) {
    if (this.mockMode) {
      return this.mockPrintCommand(order, command);
    }

    if (!this.printer) {
      await this.initialize();
    }

    try {
      this.printer.clear();

      // === HEADER ===
      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.bold(true);
      this.printer.println('COMANDA');
      this.printer.bold(false);
      this.printer.setTextSize(0, 0);
      this.printer.drawLine();
      this.printer.newLine();

      // === INFO ===
      this.printer.alignLeft();
      this.printer.bold(true);
      this.printer.println(`Tavolo: ${order.table_number}`);
      this.printer.println(`Comanda #${command.command_number}`);
      this.printer.bold(false);

      const date = new Date(command.created_at || order.created_at);
      this.printer.println(`Ora: ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
      this.printer.drawLine();
      this.printer.newLine();

      // === ITEMS COMANDA ===
      const items = command.items || [];
      if (items.length === 0) {
        this.printer.println('Nessun prodotto');
      } else {
        const itemsByCourse = this.groupItemsByCourse(items);

        Object.keys(itemsByCourse).sort().forEach(course => {
          if (Object.keys(itemsByCourse).length > 1) {
            this.printer.bold(true);
            this.printer.println(`--- PORTATA ${course} ---`);
            this.printer.bold(false);
          }

          itemsByCourse[course].forEach(item => {
            const flavors = typeof item.flavors === 'string'
              ? JSON.parse(item.flavors)
              : item.flavors;

            // Riga principale: quantità + categoria/nome
            const label = item.product_name
              ? `${item.quantity}x ${item.product_name}`
              : `${item.quantity}x ${item.category}`;
            this.printer.println(label);

            if (flavors && flavors.length > 0) {
              this.printer.println(`   ${flavors.join(', ')}`);
            }

            if (item.custom_note) {
              this.printer.println(`   >> ${item.custom_note}`);
            }

            this.printer.newLine();
          });
        });
      }

      this.printer.drawLine();
      this.printer.newLine();
      this.printer.alignCenter();
      this.printer.println('--- FINE COMANDA ---');
      this.printer.newLine();
      this.printer.cut();

      await this.printer.execute();

      console.log(`✅ Comanda #${command.command_number} (Ordine #${order.id}) stampata con successo`);
      return true;
    } catch (error) {
      console.error(`❌ Errore stampa comanda (Order #${order.id}, Command #${command.id}):`, error.message);
      throw error;
    }
  }

  /**
   * Inizializza connessione stampante
   */
  async initialize() {
    if (this.mockMode) {
      console.log('🖨️  Print Service in MOCK MODE (no physical printer)');
      return true;
    }

    try {
      this.printer = new ThermalPrinter(this.config);

      // Test connessione
      const isConnected = await this.printer.isPrinterConnected();

      if (isConnected) {
        console.log(`✅ Stampante connessa: ${this.config.interface}`);
        return true;
      } else {
        console.error('❌ Stampante non risponde');
        return false;
      }
    } catch (error) {
      console.error('❌ Errore inizializzazione stampante:', error.message);
      return false;
    }
  }

  /**
   * Stampa ricevuta ordine
   * @param {Object} order - Ordine completo con items
   * @returns {Promise<boolean>} - true se stampa riuscita
   */
  async printOrder(order) {
    if (this.mockMode) {
      return this.mockPrint(order);
    }

    if (!this.printer) {
      await this.initialize();
    }

    try {
      // Clear buffer
      this.printer.clear();

      // === HEADER ===
      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.bold(true);
      this.printer.println('GELATERIA VICANTO');
      this.printer.bold(false);
      this.printer.setTextSize(0, 0);
      this.printer.println('Via Roma, 123');
      this.printer.println('Tel: 0123-456789');
      this.printer.drawLine();
      this.printer.newLine();

      // === INFO ORDINE ===
      this.printer.alignLeft();
      this.printer.bold(true);
      this.printer.println(`ORDINE #${order.id}`);
      this.printer.bold(false);

      const date = new Date(order.created_at);
      this.printer.println(`Data: ${date.toLocaleDateString('it-IT')}`);
      this.printer.println(`Ora: ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`);
      this.printer.println(`Tavolo: ${order.table_number}`);
      this.printer.println(`Coperti: ${order.covers}`);
      this.printer.println(`Cameriere: ${order.user_id}`);

      if (order.notes) {
        this.printer.println(`Note: ${order.notes}`);
      }

      this.printer.drawLine();
      this.printer.newLine();

      // === ITEMS ===
      this.printer.bold(true);
      this.printer.println('PRODOTTI:');
      this.printer.bold(false);
      this.printer.newLine();

      // Raggruppa items per portata (course)
      const itemsByCourse = this.groupItemsByCourse(order.items);

      Object.keys(itemsByCourse).sort().forEach(course => {
        if (Object.keys(itemsByCourse).length > 1) {
          this.printer.bold(true);
          this.printer.println(`--- PORTATA ${course} ---`);
          this.printer.bold(false);
        }

        itemsByCourse[course].forEach(item => {
          // Parsea flavors se è stringa JSON
          const flavors = typeof item.flavors === 'string'
            ? JSON.parse(item.flavors)
            : item.flavors;

          // Categoria e quantità
          this.printer.tableCustom([
            { text: `${item.quantity}x ${item.category}`, align: 'LEFT', width: 0.7 },
            { text: `€${parseFloat(item.total_price).toFixed(2)}`, align: 'RIGHT', width: 0.3 }
          ]);

          // Gusti (indentati)
          if (flavors && flavors.length > 0) {
            this.printer.println(`   ${flavors.join(', ')}`);
          }

          // Note custom item
          if (item.custom_note) {
            this.printer.println(`   >> ${item.custom_note}`);
          }

          this.printer.newLine();
        });
      });

      this.printer.drawLine();

      // === TOTALI ===
      this.printer.newLine();
      this.printer.tableCustom([
        { text: 'Subtotale:', align: 'LEFT', width: 0.7 },
        { text: `€${parseFloat(order.subtotal).toFixed(2)}`, align: 'RIGHT', width: 0.3 }
      ]);

      this.printer.tableCustom([
        { text: `Coperto (${order.covers}x €0.20):`, align: 'LEFT', width: 0.7 },
        { text: `€${parseFloat(order.cover_charge).toFixed(2)}`, align: 'RIGHT', width: 0.3 }
      ]);

      this.printer.drawLine();

      this.printer.bold(true);
      this.printer.setTextSize(1, 1);
      this.printer.tableCustom([
        { text: 'TOTALE:', align: 'LEFT', width: 0.7 },
        { text: `€${parseFloat(order.total).toFixed(2)}`, align: 'RIGHT', width: 0.3 }
      ]);
      this.printer.bold(false);
      this.printer.setTextSize(0, 0);

      this.printer.drawLine();

      // === FOOTER ===
      this.printer.newLine();
      this.printer.alignCenter();
      this.printer.println('Grazie e arrivederci!');
      this.printer.newLine();
      this.printer.println('www.gelateriacvicanto.it');

      // Taglia carta (se stampante supporta)
      this.printer.cut();

      // Esegui stampa
      await this.printer.execute();

      console.log(`✅ Ordine #${order.id} stampato con successo`);
      return true;

    } catch (error) {
      console.error(`❌ Errore stampa ordine #${order.id}:`, error.message);
      throw error;
    }
  }

  /**
   * Mock print (per testing senza stampante)
   */
  async mockPrint(order) {
    console.log('\n' + '='.repeat(50));
    console.log('🖨️  MOCK PRINT - Ordine #' + order.id);
    console.log('='.repeat(50));
    console.log(`Tavolo: ${order.table_number} | Coperti: ${order.covers}`);
    console.log(`Totale: €${order.total}`);
    console.log(`Items: ${order.items.length}`);

    order.items.forEach(item => {
      const flavors = typeof item.flavors === 'string'
        ? JSON.parse(item.flavors)
        : item.flavors;
      console.log(`  - ${item.quantity}x ${item.category}: ${flavors.join(', ')}`);
    });

    console.log('='.repeat(50) + '\n');

    // Simula tempo di stampa
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
  }

  /**
   * Mock print comanda (per testing senza stampante)
   */
  async mockPrintCommand(order, command) {
    console.log('\n' + '='.repeat(50));
    console.log(`🖨️  MOCK PRINT - COMANDA #${command.command_number} (Ordine #${order.id})`);
    console.log('='.repeat(50));
    console.log(`Tavolo: ${order.table_number} | Coperti: ${order.covers}`);
    console.log(`Items comanda: ${(command.items || []).length}`);

    ;(command.items || []).forEach(item => {
      const flavors = typeof item.flavors === 'string'
        ? JSON.parse(item.flavors)
        : item.flavors;
      const label = item.product_name
        ? `${item.quantity}x ${item.product_name}`
        : `${item.quantity}x ${item.category}`;
      console.log(`  - ${label}${flavors && flavors.length ? `: ${flavors.join(', ')}` : ''}`);
      if (item.custom_note) console.log(`    >> ${item.custom_note}`);
    });

    console.log('='.repeat(50) + '\n');

    await new Promise(resolve => setTimeout(resolve, 300));
    return true;
  }

  /**
   * Raggruppa items per numero di portata
   */
  groupItemsByCourse(items) {
    const grouped = {};

    items.forEach(item => {
      const course = item.course || 1;
      if (!grouped[course]) {
        grouped[course] = [];
      }
      grouped[course].push(item);
    });

    return grouped;
  }

  /**
   * Test stampante (stampa di prova)
   */
  async testPrint() {
    if (this.mockMode) {
      console.log('🖨️  TEST PRINT (MOCK MODE)');
      console.log('✅ Test stampante simulato OK');
      return true;
    }

    if (!this.printer) {
      await this.initialize();
    }

    try {
      this.printer.clear();
      this.printer.alignCenter();
      this.printer.bold(true);
      this.printer.println('TEST STAMPANTE');
      this.printer.bold(false);
      this.printer.println('GELATERIA VICANTO');
      this.printer.newLine();
      this.printer.println(new Date().toLocaleString('it-IT'));
      this.printer.newLine();
      this.printer.println('✓ Stampante funzionante');
      this.printer.cut();

      await this.printer.execute();

      console.log('✅ Test stampa completato');
      return true;
    } catch (error) {
      console.error('❌ Test stampa fallito:', error.message);
      throw error;
    }
  }

  /**
   * Chiudi connessione stampante
   */
  async close() {
    if (this.printer && !this.mockMode) {
      // ThermalPrinter non ha close, ma possiamo resettare
      this.printer = null;
      console.log('🔌 Connessione stampante chiusa');
    }
  }
}

module.exports = PrintService;
