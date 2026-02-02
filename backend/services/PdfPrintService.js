/**
 * PDF Print Service - Genera PDF delle comande
 * Layout simile a scontrino termico
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfPrintService {
  constructor(config = {}) {
    this.baseDir = config.outputDir || path.join(__dirname, '..', 'prints');
    this.comandeDir = path.join(this.baseDir, 'comande');
    this.precontiDir = path.join(this.baseDir, 'preconti');

    // Crea directory se non esistono
    if (!fs.existsSync(this.comandeDir)) {
      fs.mkdirSync(this.comandeDir, { recursive: true });
    }
    if (!fs.existsSync(this.precontiDir)) {
      fs.mkdirSync(this.precontiDir, { recursive: true });
    }
  }

  drawLine(doc) {
    doc.text('________________________________', { align: 'center' });
  }

  /**
   * Stampa COMANDA in PDF (per cucina)
   */
  async printCommand(order, command) {
    const filename = `comanda_${order.id}_${command.command_number}_${Date.now()}.pdf`;
    const filepath = path.join(this.comandeDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [226, 400],
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // HEADER
        doc.fontSize(14).font('Helvetica-Bold').text('Nuova Comanda', { align: 'center' });
        doc.moveDown(0.3);

        // TAVOLO
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Tavolo   ${order.table_number}`, { align: 'left' });
        doc.moveDown(0.3);
        this.drawLine(doc);
        doc.moveDown(0.5);

        // ITEMS (prodotti)
        const items = command.items || [];
        items.forEach(item => {
          const flavors = typeof item.flavors === 'string'
            ? JSON.parse(item.flavors)
            : item.flavors;

          const name = item.product_name || item.category || 'Prodotto';
          
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${item.quantity}   ${name}`);
          
          doc.fontSize(9).font('Helvetica');
          if (flavors && flavors.length > 0) {
            doc.text(`    -${flavors.join(', ')}`);
          }

          // Aggiungi supplementi
          const supplements = typeof item.supplements === 'string'
            ? JSON.parse(item.supplements)
            : item.supplements;
          
          if (supplements && supplements.length > 0) {
            doc.text(`    -${supplements.map(s => s.name || s).join(', ')}`);
          }

          if (item.custom_note) {
            doc.text(`    >> ${item.custom_note}`);
          }

          doc.moveDown(0.3);
        });

        doc.moveDown(0.5);
        this.drawLine(doc);
        doc.moveDown(0.5);
        
        // FOOTER
        doc.fontSize(11).font('Helvetica-Bold').text('-Vicanto-', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log(`✅ PDF Comanda generato: ${filepath}`);
          resolve(filepath);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stampa PRECONTO in PDF (per cliente)
   */
  async printOrder(order) {
    const filename = `preconto_${order.id}_${Date.now()}.pdf`;
    const filepath = path.join(this.precontiDir, filename);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [226, 500],
          margins: { top: 15, bottom: 15, left: 10, right: 10 }
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // HEADER LOCALE
        doc.fontSize(12).font('Helvetica-Bold').text('GELATERIA VICANTO', { align: 'center' });
        doc.fontSize(8).font('Helvetica');
        doc.text('Via Roma, 123', { align: 'center' });
        doc.text('Tel. 0123 456789', { align: 'center' });
        doc.moveDown(0.5);

        // LINEA DI SEPARAZIONE
        this.drawLine(doc);
        doc.moveDown(0.5);

        // TAVOLO (grande)
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`TAVOLO ${order.table_number}`, { align: 'center' });
        doc.moveDown(0.5);

        // PRODOTTI
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('PRODOTTI');
        doc.moveDown(0.3);
        
        const items = order.items || [];
        items.forEach(item => {
          const flavors = typeof item.flavors === 'string'
            ? JSON.parse(item.flavors)
            : item.flavors;

          const name = item.product_name || item.category_name || 'Prodotto';
          const price = parseFloat(item.total_price || item.unit_price || 0).toFixed(2);
          
          doc.fontSize(10).font('Helvetica');
          doc.text(`${item.quantity}x ${name}`, { continued: true });
          doc.text(`   ${price}`, { align: 'right' });
          
          if (flavors && flavors.length > 0) {
            doc.fontSize(8).text(`   -${flavors.join(', ')}`);
          }

          // Aggiungi supplementi
          const supplements = typeof item.supplements === 'string'
            ? JSON.parse(item.supplements)
            : item.supplements;
          
          if (supplements && supplements.length > 0) {
            doc.fontSize(8).text(`   -${supplements.map(s => s.name || s).join(', ')}`);
          }

          if (item.custom_note) {
            doc.fontSize(8).text(`   ${item.custom_note}`);
          }
          
          doc.moveDown(0.3); // Spazio tra prodotti
        });

        doc.moveDown(0.5);

        // TOTALE CONTO
        const total = parseFloat(order.total || 0).toFixed(2);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`TOTALE CONTO   ${total}`);

        doc.moveDown(0.3);

        // DATA ORA
        const date = new Date(order.created_at);
        doc.fontSize(9).font('Helvetica');
        doc.text(`${date.toLocaleDateString('it-IT')} - ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`, { align: 'center' });

        doc.moveDown(0.5);
        this.drawLine(doc);
        doc.moveDown(0.3);

        // FOOTER FISCALE
        doc.fontSize(9).font('Helvetica-Bold').text('Preconto Gestionale', { align: 'center' });
        doc.fontSize(7).font('Helvetica').text('Questo documento non e valido ai fini fiscali', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log(`✅ PDF Preconto generato: ${filepath}`);
          resolve(filepath);
        });

        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  groupItemsByCourse(items) {
    const grouped = {};
    items.forEach(item => {
      const course = item.course || 1;
      if (!grouped[course]) grouped[course] = [];
      grouped[course].push(item);
    });
    return grouped;
  }

  async initialize() {
    console.log('📄 PDF Print Service inizializzato');
    console.log(`   Comande: ${this.comandeDir}`);
    console.log(`   Preconti: ${this.precontiDir}`);
    return true;
  }

  async close() {}
}

module.exports = PdfPrintService;
