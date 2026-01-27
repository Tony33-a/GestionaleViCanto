import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import reportsService from '../../services/reportsService'
import ordersService from '../../services/ordersService'
import './Dashboard.css'

function MonitorClosedTables() {
  const navigate = useNavigate()
  const [range, setRange] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set()) // Set per ID multipli
  const [orderDetails, setOrderDetails] = useState({}) // Stato per dati dettagli

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

  const closedOrdersQuery = useQuery({
    queryKey: ['orders', 'closed-tables', params],
    queryFn: () => reportsService.getOrders({ ...params, status: 'completed', limit: 100 })
  })

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Tavoli Chiusi</h1>
          <p>Elenco tavoli chiusi con riepilogo ordine</p>
        </div>
        <button 
          className="back-button-red"
          onClick={() => navigate('/monitor/statistics')}
        >
          ← Indietro
        </button>
      </div>

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

      {closedOrdersQuery.error && <div className="dashboard-error">Errore caricamento tavoli chiusi</div>}

      <div className="closed-tables-list">
        {/* Intestazioni colonne */}
        <div className="table-headers table-headers-closed">
          <div className="header-table">Tavolo</div>
          <div className="header-time">Ora</div>
          <div className="header-covers">Coperti</div>
          <div className="header-waiter">Cameriere</div>
          <div className="header-total">Totale</div>
          <div className="header-actions">Azioni</div>
        </div>

        {closedOrdersQuery.isLoading && <p className="empty-state">Caricamento tavoli chiusi...</p>}
        {!closedOrdersQuery.isLoading && closedOrdersQuery.data?.data?.length === 0 && (
          <p className="empty-state">Nessun tavolo chiuso</p>
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
  )
}

export default MonitorClosedTables
