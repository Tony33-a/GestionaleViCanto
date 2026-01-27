import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import reportsService from '../../services/reportsService'
import { socketService } from '../../services/socket'
import './Dashboard.css'

function MonitorDashboard() {
  const [range, setRange] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showAverageTicketInfo, setShowAverageTicketInfo] = useState(false)
  const navigate = useNavigate()

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

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => reportsService.getDashboard(params),
    refetchOnWindowFocus: true
  })

  useEffect(() => {
    const handleOrderCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    socketService.on('order:completed', handleOrderCompleted)
    socketService.on('table:updated', handleOrderCompleted)

    return () => {
      socketService.off('order:completed')
      socketService.off('table:updated')
    }
  }, [queryClient])

  const revenueByDay = (data?.revenue_by_day || []).map((d) => ({
    ...d,
    revenue: parseFloat(d.revenue) || 0,
    orders: parseInt(d.orders) || 0
  }))
  const topProducts = (data?.top_products || []).map((p) => ({
    ...p,
    quantity: parseInt(p.quantity) || 0,
    revenue: parseFloat(p.revenue) || 0
  }))
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 0)

  const pieSegments = useMemo(() => {
    const total = topProducts.reduce((sum, p) => sum + p.revenue, 0)
    if (!total) return []

    let acc = 0
    const colors = ['#34d399', '#10b981', '#059669', '#22c55e', '#4ade80', '#16a34a']
    return topProducts.slice(0, 6).map((p, index) => {
      const value = (p.revenue / total) * 100
      const start = acc
      const end = acc + value
      acc = end
      return {
        label: p.product,
        value,
        start,
        end,
        color: colors[index % colors.length]
      }
    })
  }, [topProducts])

  const pieBackground = pieSegments.length
    ? `conic-gradient(${pieSegments
        .map((seg) => `${seg.color} ${seg.start}% ${seg.end}%`)
        .join(', ')})`
    : '#e5e7eb'


  return (
    <div className="page-container dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Ordini, incassi e prodotti più venduti</p>
      </div>

      <div className="dashboard-filters">
        <button
          className={range === 'today' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setRange('today')}
        >
          Oggi
        </button>
        <button
          className={range === '7d' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setRange('7d')}
        >
          Ultimi 7 giorni
        </button>
        <button
          className={range === '30d' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setRange('30d')}
        >
          Ultimi 30 giorni
        </button>
        <button
          className={range === 'custom' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setRange('custom')}
        >
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

      {error && <div className="dashboard-error">Errore caricamento dashboard</div>}

      <div className="grid grid-4 dashboard-kpis">
        <div className="card kpi-clickable" onClick={() => navigate('/monitor/orders')}>
          <h3>Ordini</h3>
          <p className="stat-value">{isLoading ? '...' : data?.orders?.total ?? 0}</p>
        </div>
        <div className="card">
          <h3>Incasso</h3>
          <p className="stat-value">€{isLoading ? '...' : (data?.orders?.revenue ?? 0).toFixed(2)}</p>
        </div>
        <div className="card">
          <h3 className="kpi-with-info">
            Scontrino Medio
            <span 
              className="info-icon" 
              onClick={(e) => {
                e.stopPropagation()
                setShowAverageTicketInfo(!showAverageTicketInfo)
              }}
            >
              i
              {showAverageTicketInfo && (
                <div className="info-tooltip">
                  Spesa media per tavolo<br/>= incasso totale / numero ordini
                </div>
              )}
            </span>
          </h3>
          <p className="stat-value">€{isLoading ? '...' : (data?.orders?.average_ticket ?? 0).toFixed(2)}</p>
        </div>
        <div className="card kpi-clickable" onClick={() => navigate('/monitor/closed-tables')}>
          <h3>Tavoli Chiusi</h3>
          <p className="stat-value">{isLoading ? '...' : data?.tables?.closed ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-2 dashboard-charts">
        <div className="card">
          <div className="card-header">
            <h3>Incassi Giornalieri</h3>
          </div>
          <div className={`histogram ${revenueByDay.length === 1 ? 'histogram-single' : ''}`}>
            {revenueByDay.length === 0 && !isLoading && (
              <span className="empty-state">Nessun dato nel periodo</span>
            )}
            {revenueByDay.map((day) => (
              <div key={day.date} className="histogram-bar">
                <span className="histogram-value">€{day.revenue.toFixed(2)}</span>
                <div
                  className="histogram-fill"
                  style={{
                    height: maxRevenue
                      ? `${Math.min(170, Math.max(16, (day.revenue / maxRevenue) * 170))}px`
                      : '0px'
                  }}
                />
                <span className="histogram-label">
                  {new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Prodotti più venduti</h3>
          </div>
          <div className="pie-section">
            <div className="pie-chart" style={{ background: pieBackground }} />
            <div className="pie-legend">
              {topProducts.slice(0, 6).map((product, index) => (
                <div key={product.product} className="pie-legend-item">
                  <span
                    className="pie-dot"
                    style={{ background: pieSegments[index]?.color || '#10b981' }}
                  />
                  <span className="pie-name">{product.product}</span>
                  <strong className="pie-qty">{product.quantity}</strong>
                  <span className="pie-revenue">€{product.revenue.toFixed(2)}</span>
                </div>
              ))}
              {topProducts.length === 0 && !isLoading && (
                <span className="empty-state">Nessun prodotto nel periodo</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default MonitorDashboard
