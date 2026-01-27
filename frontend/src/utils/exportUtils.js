import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

/**
 * Utility per export dati in PDF e XLS
 */

/**
 * Formatta la data per il nome file
 */
const formatDateForFilename = () => {
  const now = new Date()
  return now.toISOString().split('T')[0].replace(/-/g, '')
}

/**
 * Formatta la data per visualizzazione
 */
const formatDate = (dateValue) => {
  if (!dateValue) return '-'
  try {
    return new Date(dateValue).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (e) {
    return '-'
  }
}

/**
 * Formatta l'ora per visualizzazione
 */
const formatTime = (dateValue) => {
  if (!dateValue) return '-'
  try {
    return new Date(dateValue).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return '-'
  }
}

/**
 * Converte valore in numero sicuro (no NaN)
 */
const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

/**
 * Formatta valuta
 */
const formatCurrency = (value) => {
  return safeNumber(value).toFixed(2)
}

/**
 * Export ordini in PDF
 * @param {Array} orders - Lista ordini
 * @param {Object} options - Opzioni (title, dateRange, includeDetails)
 */
export const exportOrdersToPDF = (orders, options = {}) => {
  const {
    title = 'Report Ordini',
    dateRange = '',
    includeDetails = false
  } = options

  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFontSize(24)
    doc.setTextColor(40, 40, 40)
    doc.text('ViCanto', pageWidth / 2, 25, { align: 'center' })

    doc.setFontSize(16)
    doc.text(title, pageWidth / 2, 35, { align: 'center' })

    if (dateRange) {
      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text('Periodo: ' + dateRange, pageWidth / 2, 45, { align: 'center' })
    }

    // Data generazione
    doc.setFontSize(9)
    doc.text('Generato il: ' + new Date().toLocaleString('it-IT'), pageWidth / 2, 52, { align: 'center' })

    // Calcola statistiche con safeNumber
    const totalOrders = orders.length
    const totalRevenue = orders.reduce(function(sum, o) { return sum + safeNumber(o.total) }, 0)
    const totalCovers = orders.reduce(function(sum, o) { return sum + safeNumber(o.covers) }, 0)
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    if (!includeDetails) {
      // ===== MODALITA' RIEPILOGO: Solo statistiche =====

      doc.setFontSize(14)
      doc.setTextColor(40, 40, 40)
      doc.text('Riepilogo Statistiche', pageWidth / 2, 70, { align: 'center' })

      // Box statistiche
      const statsData = [
        ['Totale Ordini', String(totalOrders)],
        ['Totale Coperti', String(totalCovers)],
        ['Incasso Totale', 'EUR ' + formatCurrency(totalRevenue)],
        ['Scontrino Medio', 'EUR ' + formatCurrency(averageTicket)]
      ]

      autoTable(doc, {
        startY: 80,
        head: [['Statistica', 'Valore']],
        body: statsData,
        theme: 'grid',
        headStyles: {
          fillColor: [66, 66, 66],
          textColor: 255,
          fontSize: 12,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 11,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 60 }
        },
        margin: { left: 35, right: 35 }
      })

      // Footer
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Report generato automaticamente da ViCanto POS', pageWidth / 2, 180, { align: 'center' })

    } else {
      // ===== MODALITA' DETTAGLI: Tabella completa ordini =====

      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)

      // Statistiche riepilogo in alto
      var summaryText = 'Ordini: ' + totalOrders + '  |  Incasso: EUR ' + formatCurrency(totalRevenue) + '  |  Coperti: ' + totalCovers + '  |  Scontrino Medio: EUR ' + formatCurrency(averageTicket)
      doc.text(summaryText, pageWidth / 2, 65, { align: 'center' })

      // Tabella ordini
      var tableData = orders.map(function(order) {
        return [
          String(order.id || '-'),
          String(order.table_number || '-'),
          formatDate(order.created_at),
          formatTime(order.created_at),
          String(safeNumber(order.covers)),
          String(order.waiter_username || '-'),
          'EUR ' + formatCurrency(order.total)
        ]
      })

      autoTable(doc, {
        startY: 75,
        head: [['ID', 'Tavolo', 'Data', 'Ora', 'Coperti', 'Cameriere', 'Totale']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [66, 66, 66],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 20 },
          2: { cellWidth: 28 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 35 },
          6: { cellWidth: 28, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      })

      // Footer con totale e scontrino medio
      var finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 200
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text('TOTALE COMPLESSIVO: EUR ' + formatCurrency(totalRevenue), pageWidth - 14, finalY + 10, { align: 'right' })
      doc.text('SCONTRINO MEDIO: EUR ' + formatCurrency(averageTicket), pageWidth - 14, finalY + 18, { align: 'right' })
    }

    // Salva
    var filename = includeDetails
      ? 'ordini_dettaglio_' + formatDateForFilename() + '.pdf'
      : 'ordini_riepilogo_' + formatDateForFilename() + '.pdf'

    doc.save(filename)
    return filename

  } catch (error) {
    console.error('Errore generazione PDF:', error)
    alert('Errore PDF: ' + error.message)
    throw error
  }
}

/**
 * Export ordini in Excel (XLS)
 * @param {Array} orders - Lista ordini
 * @param {Object} options - Opzioni (title, dateRange, includeDetails)
 */
export const exportOrdersToXLS = (orders, options = {}) => {
  const {
    title = 'Report Ordini',
    dateRange = '',
    includeDetails = false
  } = options

  try {
    // Crea workbook
    var wb = XLSX.utils.book_new()

    // Calcola statistiche con safeNumber
    var totalOrders = orders.length
    var totalRevenue = orders.reduce(function(sum, o) { return sum + safeNumber(o.total) }, 0)
    var totalCovers = orders.reduce(function(sum, o) { return sum + safeNumber(o.covers) }, 0)
    var averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    if (!includeDetails) {
      // ===== MODALITA' RIEPILOGO: Solo statistiche =====

      var summaryData = [
        ['ViCanto - Report Riepilogo Ordini'],
        [title],
        ['Periodo: ' + (dateRange || 'Tutti')],
        ['Generato il: ' + new Date().toLocaleString('it-IT')],
        [''],
        [''],
        ['STATISTICHE RIEPILOGO'],
        [''],
        ['Statistica', 'Valore'],
        ['Totale Ordini', totalOrders],
        ['Totale Coperti', totalCovers],
        ['Incasso Totale', totalRevenue],
        ['Scontrino Medio', Math.round(averageTicket * 100) / 100]
      ]

      var wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

      // Imposta larghezza colonne
      wsSummary['!cols'] = [
        { wch: 25 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(wb, wsSummary, 'Riepilogo')

    } else {
      // ===== MODALITA' DETTAGLI: Tabella completa ordini =====

      var detailsData = [
        ['ViCanto - Report Dettaglio Ordini'],
        [title],
        ['Periodo: ' + (dateRange || 'Tutti')],
        ['Generato il: ' + new Date().toLocaleString('it-IT')],
        [''],
        ['STATISTICHE'],
        ['Totale Ordini', totalOrders, '', 'Incasso Totale', totalRevenue],
        ['Totale Coperti', totalCovers, '', 'Scontrino Medio', Math.round(averageTicket * 100) / 100],
        [''],
        [''],
        ['DETTAGLIO ORDINI'],
        ['ID', 'Tavolo', 'Data', 'Ora', 'Coperti', 'Cameriere', 'Totale']
      ]

      // Aggiungi righe ordini
      orders.forEach(function(order) {
        detailsData.push([
          safeNumber(order.id),
          order.table_number || '-',
          formatDate(order.created_at),
          formatTime(order.created_at),
          safeNumber(order.covers),
          order.waiter_username || '-',
          safeNumber(order.total)
        ])
      })

      // Riga totale e scontrino medio
      detailsData.push([''])
      detailsData.push(['', '', '', '', '', 'TOTALE:', totalRevenue])
      detailsData.push(['', '', '', '', '', 'SCONTRINO MEDIO:', Math.round(averageTicket * 100) / 100])

      var wsDetails = XLSX.utils.aoa_to_sheet(detailsData)

      // Imposta larghezza colonne
      wsDetails['!cols'] = [
        { wch: 8 },
        { wch: 10 },
        { wch: 12 },
        { wch: 8 },
        { wch: 10 },
        { wch: 18 },
        { wch: 12 }
      ]

      XLSX.utils.book_append_sheet(wb, wsDetails, 'Dettaglio')
    }

    // Genera file
    var filename = includeDetails
      ? 'ordini_dettaglio_' + formatDateForFilename() + '.xlsx'
      : 'ordini_riepilogo_' + formatDateForFilename() + '.xlsx'

    XLSX.writeFile(wb, filename)

    return filename

  } catch (error) {
    console.error('Errore generazione XLS:', error)
    alert('Errore Excel: ' + error.message)
    throw error
  }
}

/**
 * Export generico dati tabella in PDF
 */
export const exportTableToPDF = (config) => {
  var title = config.title
  var headers = config.headers
  var data = config.data
  var filename = config.filename || 'export.pdf'

  try {
    var doc = new jsPDF()
    var pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    doc.text('ViCanto', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.text(title, pageWidth / 2, 30, { align: 'center' })

    doc.setFontSize(8)
    doc.text('Generato il: ' + new Date().toLocaleString('it-IT'), pageWidth / 2, 38, { align: 'center' })

    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      margin: { left: 14, right: 14 }
    })

    doc.save(filename)
    return filename
  } catch (error) {
    console.error('Errore generazione PDF:', error)
    throw error
  }
}

/**
 * Export generico dati tabella in Excel
 */
export const exportTableToXLS = (config) => {
  var title = config.title
  var headers = config.headers
  var data = config.data
  var filename = config.filename || 'export.xlsx'

  try {
    var wb = XLSX.utils.book_new()

    var sheetData = [
      [title],
      ['Generato il: ' + new Date().toLocaleString('it-IT')],
      [''],
      headers
    ]

    data.forEach(function(row) {
      sheetData.push(row)
    })

    var ws = XLSX.utils.aoa_to_sheet(sheetData)
    XLSX.utils.book_append_sheet(wb, ws, 'Dati')

    XLSX.writeFile(wb, filename)

    return filename
  } catch (error) {
    console.error('Errore generazione XLS:', error)
    throw error
  }
}

export default {
  exportOrdersToPDF,
  exportOrdersToXLS,
  exportTableToPDF,
  exportTableToXLS
}
