import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import reportsService from '../../services/reportsService'
import ordersService from '../../services/ordersService'
import { exportOrdersToPDF, exportOrdersToXLS } from '../../utils/exportUtils'
import './Dashboard.css'

function DashboardOrders() {
  const navigate = useNavigate()
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set()) // Set per ID multipli
  const [range, setRange] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const params = useMemo(() => {
    if (range === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo }
    }

    const today = new Date()
    const format = (date) => date.toISOString().split('T')[0]

    if (range === 'today') {
      return { from: format(today), to: format(today) }
    }

    const start = new Date(today)
    if (range === '7d') start.setDate(today.getDate() - 6)
    if (range === '30d') start.setDate(today.getDate() - 29)

    return { from: format(start), to: format(today) }
  }, [range, customFrom, customTo])

  // Recupera ordini aperti (pending e sent)
  const activeOrdersQuery = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: async () => {
      try {
        const result = await reportsService.getOrders({ status: 'pending,sent', limit: 100 })
        return result.data || []
      } catch (error) {
        console.error('Error fetching active orders:', error)
        throw error
      }
    }
  })

  // Recupera ordini chiusi con filtri data
  const closedOrdersQuery = useQuery({
    queryKey: ['orders', 'closed', params],
    queryFn: () => reportsService.getOrders({ ...params, status: 'completed', limit: 100 })
  })

  // Stato per dati dettagli ordini
  const [orderDetails, setOrderDetails] = useState({})

  // Funzioni per gestire selezione multipla
  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
        // Rimuovi dettagli quando deselezioni
        setOrderDetails(details => {
          const newDetails = { ...details }
          delete newDetails[orderId]
          return newDetails
        })
      } else {
        newSet.add(orderId)
        // Carica dettagli quando selezioni
        if (!orderDetails[orderId]) {
          ordersService.getById(orderId)
            .then(details => {
              setOrderDetails(prev => ({
                ...prev,
                [orderId]: details
              }))
            })
            .catch(error => {
              console.error('Error loading order details:', error)
            })
        }
      }
      return newSet
    })
  }

  const closeOrderDetail = (orderId) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(orderId)
      return newSet
    })
    // Rimuovi dettagli
    setOrderDetails(details => {
      const newDetails = { ...details }
      delete newDetails[orderId]
      return newDetails
    })
  }

  const formatTime = (dateValue) => {
    if (!dateValue) return '-'
    return new Date(dateValue).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (value) => {
    const amount = Number(value)
    if (Number.isNaN(amount)) return '0.00'
    return amount.toFixed(2)
  }

  // Funzione per ottenere la descrizione del range
  const getDateRangeDescription = () => {
    if (range === 'today') return 'Oggi'
    if (range === '7d') return 'Ultimi 7 giorni'
    if (range === '30d') return 'Ultimi 30 giorni'
    if (range === 'custom' && customFrom && customTo) {
      return `${customFrom} - ${customTo}`
    }
    return ''
  }

  // Handler export PDF
  const handleExportPDF = async (includeDetails = false) => {
    setExporting(true)
    setShowExportMenu(false)

    try {
      // Combina ordini aperti e chiusi
      const activeOrders = activeOrdersQuery.data || []
      const closedOrders = closedOrdersQuery.data?.data || []
      const allOrders = [...activeOrders, ...closedOrders]

      if (allOrders.length === 0) {
        alert('Nessun ordine da esportare')
        setExporting(false)
        return
      }

      const filename = exportOrdersToPDF(allOrders, {
        title: 'Report Ordini',
        dateRange: getDateRangeDescription(),
        includeDetails,
        orderDetails
      })

      console.log('PDF exported:', filename)
    } catch (error) {
      console.error('Errore export PDF:', error)
      alert('Errore durante l\'export PDF')
    } finally {
      setExporting(false)
    }
  }

  // Handler export XLS
  const handleExportXLS = async (includeDetails = false) => {
    setExporting(true)
    setShowExportMenu(false)

    try {
      // Combina ordini aperti e chiusi
      const activeOrders = activeOrdersQuery.data || []
      const closedOrders = closedOrdersQuery.data?.data || []
      const allOrders = [...activeOrders, ...closedOrders]

      if (allOrders.length === 0) {
        alert('Nessun ordine da esportare')
        setExporting(false)
        return
      }

      const filename = exportOrdersToXLS(allOrders, {
        title: 'Report Ordini',
        dateRange: getDateRangeDescription(),
        includeDetails,
        orderDetails
      })

      console.log('XLS exported:', filename)
    } catch (error) {
      console.error('Errore export XLS:', error)
      alert('Errore durante l\'export Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Ordini</h1>
          <p>Ordini aperti e chiusi con filtri data</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="export-button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                cursor: exporting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {exporting ? 'Esportando...' : 'Esporta'}
            </button>

            {showExportMenu && (
              <div
                className="export-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 1000,
                  minWidth: '200px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => handleExportPDF(false)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #333',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#333'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  PDF - Riepilogo
                </button>
                <button
                  onClick={() => handleExportPDF(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #333',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#333'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  PDF - Con dettagli
                </button>
                <button
                  onClick={() => handleExportXLS(false)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #333',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#333'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Excel - Riepilogo
                </button>
                <button
                  onClick={() => handleExportXLS(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#333'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Excel - Con dettagli
                </button>
              </div>
            )}
          </div>

          <button
            className="back-button-red"
            onClick={() => navigate('/monitor/statistics')}
          >
            ← Indietro
          </button>
        </div>
      </div>

      {/* Overlay per chiudere menu export */}
      {showExportMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Filtri data */}
      <div className="dashboard-filters">
        <button className={range === 'today' ? 'filter-btn active' : 'filter-btn'} onClick={() => setRange('today')}>
          Oggi
        </button>
        <button className={range === '7d' ? 'filter-btn active' : 'filter-btn'} onClick={() => setRange('7d')}>
          Ultimi 7 giorni
        </button>
        <button className={range === '30d' ? 'filter-btn active' : 'filter-btn'} onClick={() => setRange('30d')}>
          Ultimi 30 giorni
        </button>
        <button className={range === 'custom' ? 'filter-btn active' : 'filter-btn'} onClick={() => setRange('custom')}>
          Range
        </button>
        {range === 'custom' && (
          <div className="filter-range">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Ordini Aperti */}
      <div className="orders-section">
        <h3>🟢 Ordini Aperti</h3>
        <div className="orders-list">
          {/* Intestazioni colonne */}
          <div className="table-headers table-headers-open">
            <div className="header-table">Ordine</div>
            <div className="header-time">Ora</div>
            <div className="header-covers">Coperti</div>
            <div className="header-waiter">Cameriere</div>
            <div className="header-total">Totale</div>
            <div className="header-actions">Azioni</div>
          </div>

          {activeOrdersQuery.isLoading && <p className="empty-state">Caricamento ordini aperti...</p>}
          {!activeOrdersQuery.isLoading && (!activeOrdersQuery.data || activeOrdersQuery.data.length === 0) && (
            <p className="empty-state">Nessun ordine aperto</p>
          )}
          {activeOrdersQuery.data && activeOrdersQuery.data.map((order) => (
            <React.Fragment key={order.id}>
              <div className="table-row table-row-open">
                <div className="col-table">
                  <strong>#{order.id}</strong>
                  {order.table_number && <span className="order-meta"> • Tavolo {order.table_number}</span>}
                </div>
                <div className="col-time">
                  {formatTime(order.created_at)}
                </div>
                <div className="col-covers">
                  {order.covers ?? 0}
                </div>
                <div className="col-waiter">
                  {order.waiter_username ?? '-'}
                </div>
                <div className="col-total">
                  €{formatCurrency(order.total)}
                </div>
                <div className="col-actions">
                  <button
                    type="button"
                    className={`info-icon info-button ${selectedOrderIds.has(order.id) ? 'info-button-selected' : 'info-button-open'}`}
                    onClick={() => toggleOrderSelection(order.id)}
                  >
                    i
                  </button>
                </div>
              </div>
              
              {/* Dettaglio Ordine - appare subito dopo la riga cliccata */}
              {selectedOrderIds.has(order.id) && (
                <div className="order-detail order-detail-enhanced">
                  {!orderDetails[order.id] && <p className="empty-state">Caricamento dettagli...</p>}
                  {orderDetails[order.id] && (
                    <div>
                      <div className="order-detail-header">
                        <h4>📋 Riepilogo Ordine</h4>
                        <button 
                          className="close-detail-btn"
                          onClick={() => closeOrderDetail(order.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="order-detail-info">
                        <p>
                          <strong>Tavolo:</strong> {orderDetails[order.id].table_number ?? '-'} •
                          <strong> Ora:</strong> {formatTime(orderDetails[order.id].created_at)} •
                          <strong> Coperti:</strong> {orderDetails[order.id].covers ?? 0} •
                          <strong> Cameriere:</strong> {orderDetails[order.id].waiter_username ?? '-'}
                        </p>
                      </div>
                      <div className="order-items">
                        {orderDetails[order.id].items?.map((item, index) => (
                          <div key={`${item.product_name}-${index}`} className="order-item order-item-enhanced">
                            <span className="item-name">{item.product_name}</span>
                            <span className="item-quantity">x{item.quantity}</span>
                            <span className="item-price">€{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-total order-total-enhanced">
                        Totale: €{formatCurrency(orderDetails[order.id].total)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Ordini Chiusi */}
      <div className="orders-section">
        <h3>✅ Ordini Chiusi</h3>
        <div className="orders-list">
          {/* Intestazioni colonne */}
          <div className="table-headers table-headers-closed">
            <div className="header-table">Ordine</div>
            <div className="header-time">Ora</div>
            <div className="header-covers">Coperti</div>
            <div className="header-waiter">Cameriere</div>
            <div className="header-total">Totale</div>
            <div className="header-actions">Azioni</div>
          </div>

          {closedOrdersQuery.isLoading && <p className="empty-state">Caricamento ordini chiusi...</p>}
          {!closedOrdersQuery.isLoading && (!closedOrdersQuery.data?.data || closedOrdersQuery.data.data.length === 0) && (
            <p className="empty-state">Nessun ordine chiuso nel periodo selezionato</p>
          )}
          {closedOrdersQuery.data?.data?.map((order) => (
            <React.Fragment key={order.id}>
              <div className="table-row table-row-closed">
                <div className="col-table">
                  <strong>Tavolo {order.table_number ?? '-'}</strong>
                </div>
                <div className="col-time">
                  {formatTime(order.created_at)}
                </div>
                <div className="col-covers">
                  {order.covers ?? 0}
                </div>
                <div className="col-waiter">
                  {order.waiter_username ?? '-'}
                </div>
                <div className="col-total">
                  €{formatCurrency(order.total)}
                </div>
                <div className="col-actions">
                  <button
                    type="button"
                    className={`info-icon info-button ${selectedOrderIds.has(order.id) ? 'info-button-selected' : 'info-button-closed'}`}
                    onClick={() => toggleOrderSelection(order.id)}
                  >
                    i
                  </button>
                </div>
              </div>
              
              {/* Dettaglio Ordine - appare subito dopo la riga cliccata */}
              {selectedOrderIds.has(order.id) && (
                <div className="order-detail order-detail-enhanced">
                  {!orderDetails[order.id] && <p className="empty-state">Caricamento dettagli...</p>}
                  {orderDetails[order.id] && (
                    <div>
                      <div className="order-detail-header">
                        <h4>📋 Riepilogo Ordine</h4>
                        <button 
                          className="close-detail-btn"
                          onClick={() => closeOrderDetail(order.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="order-detail-info">
                        <p>
                          <strong>Tavolo:</strong> {orderDetails[order.id].table_number ?? '-'} •
                          <strong> Ora:</strong> {formatTime(orderDetails[order.id].created_at)} •
                          <strong> Coperti:</strong> {orderDetails[order.id].covers ?? 0} •
                          <strong> Cameriere:</strong> {orderDetails[order.id].waiter_username ?? '-'}
                        </p>
                      </div>
                      <div className="order-items">
                        {orderDetails[order.id].items?.map((item, index) => (
                          <div key={`${item.product_name}-${index}`} className="order-item order-item-enhanced">
                            <span className="item-name">{item.product_name}</span>
                            <span className="item-quantity">x{item.quantity}</span>
                            <span className="item-price">€{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-total order-total-enhanced">
                        Totale: €{formatCurrency(orderDetails[order.id].total)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardOrders
