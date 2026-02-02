/**
 * Printer Diagnostics - Pagina diagnostica stampante
 */

import { useState, useEffect, useCallback } from 'react'
import { socketService } from '../../services/socket'
import * as printerService from '../../services/printerService'
import './PrinterDiagnostics.css'

function PrinterDiagnostics() {
  const [status, setStatus] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [testLoading, setTestLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const [filter, setFilter] = useState('all')
  const [successMessage, setSuccessMessage] = useState(null)

  // Carica dati iniziali
  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [statusRes, queueRes] = await Promise.all([
        printerService.getStatus(),
        printerService.getQueue({ limit: 100 })
      ])

      if (statusRes.success) {
        setStatus(statusRes.data)
      }

      if (queueRes.success) {
        setQueue(queueRes.data.jobs)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Auto-refresh ogni 10 secondi
    const interval = setInterval(loadData, 10000)

    // Socket events per aggiornamenti real-time
    const handlePrintSuccess = (data) => {
      console.log('Print success:', data)
      loadData()
    }

    const handlePrintFailed = (data) => {
      console.log('Print failed:', data)
      loadData()
    }

    const handlePrinterOnline = () => {
      setSuccessMessage('Stampante tornata online')
      setTimeout(() => setSuccessMessage(null), 3000)
      loadData()
    }

    const handlePrinterOffline = () => {
      setError('Stampante offline')
      loadData()
    }

    socketService.on('print:success', handlePrintSuccess)
    socketService.on('print:failed', handlePrintFailed)
    socketService.on('printer:online', handlePrinterOnline)
    socketService.on('printer:offline', handlePrinterOffline)

    return () => {
      clearInterval(interval)
      socketService.off('print:success', handlePrintSuccess)
      socketService.off('print:failed', handlePrintFailed)
      socketService.off('printer:online', handlePrinterOnline)
      socketService.off('printer:offline', handlePrinterOffline)
    }
  }, [loadData])

  // Stampa di test
  const handleTestPrint = async () => {
    setTestLoading(true)
    try {
      const result = await printerService.testPrint()
      if (result.success) {
        setSuccessMessage('Stampa di test inviata')
        setTimeout(() => setSuccessMessage(null), 3000)
        loadData()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setTestLoading(false)
    }
  }

  // Riprova job fallito
  const handleRetry = async (jobId) => {
    setActionLoading(prev => ({ ...prev, [jobId]: 'retry' }))
    try {
      const result = await printerService.retryJob(jobId)
      if (result.success) {
        setSuccessMessage('Job rimesso in coda')
        setTimeout(() => setSuccessMessage(null), 3000)
        loadData()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: null }))
    }
  }

  // Cancella job
  const handleDelete = async (jobId) => {
    if (!confirm('Vuoi cancellare questo job?')) return

    setActionLoading(prev => ({ ...prev, [jobId]: 'delete' }))
    try {
      const result = await printerService.deleteJob(jobId)
      if (result.success) {
        setSuccessMessage('Job cancellato')
        setTimeout(() => setSuccessMessage(null), 3000)
        loadData()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: null }))
    }
  }

  // Pulisci job falliti
  const handleClearFailed = async () => {
    if (!confirm('Vuoi rimuovere tutti i job falliti?')) return

    try {
      const result = await printerService.clearFailed()
      if (result.success) {
        setSuccessMessage(`${result.data.deletedCount} job rimossi`)
        setTimeout(() => setSuccessMessage(null), 3000)
        loadData()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Filtra coda
  const filteredQueue = filter === 'all'
    ? queue
    : queue.filter(job => job.status === filter)

  // Status badge
  const getStatusBadge = (jobStatus) => {
    const badges = {
      pending: { class: 'badge-pending', text: 'In attesa' },
      printing: { class: 'badge-printing', text: 'In stampa' },
      printed: { class: 'badge-printed', text: 'Stampato' },
      failed: { class: 'badge-failed', text: 'Fallito' }
    }
    return badges[jobStatus] || { class: 'badge-unknown', text: jobStatus }
  }

  // Printer status icon
  const getPrinterStatusIcon = () => {
    if (!status) return { icon: '?', class: 'status-unknown' }

    const statusMap = {
      online: { icon: '✓', class: 'status-online', text: 'Online' },
      busy: { icon: '⏳', class: 'status-busy', text: 'Occupata' },
      warning: { icon: '⚠', class: 'status-warning', text: 'Attenzione' },
      idle: { icon: '○', class: 'status-idle', text: 'Inattiva' },
      unknown: { icon: '?', class: 'status-unknown', text: 'Sconosciuto' }
    }
    return statusMap[status.status] || statusMap.unknown
  }

  if (loading) {
    return (
      <div className="printer-diagnostics">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento diagnostica stampante...</p>
        </div>
      </div>
    )
  }

  const printerStatus = getPrinterStatusIcon()

  return (
    <div className="printer-diagnostics">
      {/* Header */}
      <div className="diagnostics-header">
        <h1>Diagnostica Stampante</h1>
        <button
          className="btn-refresh"
          onClick={loadData}
          disabled={loading}
        >
          Aggiorna
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="message message-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {successMessage && (
        <div className="message message-success">
          {successMessage}
        </div>
      )}

      {/* Status Cards */}
      <div className="status-grid">
        {/* Stato Stampante */}
        <div className={`status-card ${printerStatus.class}`}>
          <div className="status-icon">{printerStatus.icon}</div>
          <div className="status-info">
            <h3>Stato Stampante</h3>
            <p className="status-text">{status?.message || 'Sconosciuto'}</p>
          </div>
        </div>

        {/* Coda Stampe */}
        <div className="status-card">
          <div className="status-icon queue-icon">
            {status?.queue?.pending || 0}
          </div>
          <div className="status-info">
            <h3>In Coda</h3>
            <p className="status-text">
              {status?.queue?.printing > 0 && `${status.queue.printing} in stampa`}
            </p>
          </div>
        </div>

        {/* Stampate Oggi */}
        <div className="status-card status-success">
          <div className="status-icon">{status?.today?.printed || 0}</div>
          <div className="status-info">
            <h3>Stampate Oggi</h3>
            <p className="status-text">Completate con successo</p>
          </div>
        </div>

        {/* Errori Oggi */}
        <div className={`status-card ${(status?.today?.failed || 0) > 0 ? 'status-error' : ''}`}>
          <div className="status-icon">{status?.today?.failed || 0}</div>
          <div className="status-info">
            <h3>Errori Oggi</h3>
            <p className="status-text">
              {status?.queue?.failed > 0 && `${status.queue.failed} in coda`}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions-section">
        <h2>Azioni</h2>
        <div className="actions-grid">
          <button
            className="btn-action btn-test"
            onClick={handleTestPrint}
            disabled={testLoading}
          >
            {testLoading ? 'Invio...' : 'Stampa di Test'}
          </button>

          {(status?.queue?.failed || 0) > 0 && (
            <button
              className="btn-action btn-clear"
              onClick={handleClearFailed}
            >
              Pulisci Job Falliti ({status.queue.failed})
            </button>
          )}
        </div>
      </div>

      {/* Last Error */}
      {status?.lastError && (
        <div className="error-section">
          <h2>Ultimo Errore</h2>
          <div className="error-card">
            <div className="error-header">
              <span className="error-order">Ordine #{status.lastError.orderId}</span>
              <span className="error-attempts">
                Tentativi: {status.lastError.attempts}
              </span>
            </div>
            <p className="error-message">{status.lastError.error}</p>
            <p className="error-time">
              {new Date(status.lastError.updatedAt).toLocaleString('it-IT')}
            </p>
          </div>
        </div>
      )}

      {/* Queue Section */}
      <div className="queue-section">
        <div className="queue-header">
          <h2>Coda Stampe</h2>
          <div className="queue-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tutti ({queue.length})
            </button>
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              In attesa
            </button>
            <button
              className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
              onClick={() => setFilter('failed')}
            >
              Falliti
            </button>
            <button
              className={`filter-btn ${filter === 'printed' ? 'active' : ''}`}
              onClick={() => setFilter('printed')}
            >
              Completati
            </button>
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="empty-queue">
            <p>Nessun job nella coda</p>
          </div>
        ) : (
          <div className="queue-list">
            {filteredQueue.map(job => {
              const badge = getStatusBadge(job.status)
              const isLoading = actionLoading[job.id]

              return (
                <div key={job.id} className={`queue-item ${job.status}`}>
                  <div className="queue-item-main">
                    <div className="queue-item-info">
                      <span className="job-id">#{job.id}</span>
                      {job.tableNumber && (
                        <span className="job-table">Tavolo {job.tableNumber}</span>
                      )}
                      <span className="job-type">
                        {job.printType === 'preconto' ? 'Preconto' :
                         job.printType === 'test' ? 'Test' : 'Comanda'}
                      </span>
                    </div>
                    <span className={`status-badge ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>

                  <div className="queue-item-details">
                    <span className="job-time">
                      {new Date(job.createdAt).toLocaleString('it-IT')}
                    </span>
                    {job.attempts > 0 && (
                      <span className="job-attempts">
                        Tentativi: {job.attempts}/{job.maxAttempts}
                      </span>
                    )}
                  </div>

                  {job.errorMessage && (
                    <div className="queue-item-error">
                      {job.errorMessage}
                    </div>
                  )}

                  <div className="queue-item-actions">
                    {job.status === 'failed' && (
                      <button
                        className="btn-small btn-retry"
                        onClick={() => handleRetry(job.id)}
                        disabled={isLoading}
                      >
                        {isLoading === 'retry' ? '...' : 'Riprova'}
                      </button>
                    )}
                    {job.status !== 'printing' && (
                      <button
                        className="btn-small btn-delete"
                        onClick={() => handleDelete(job.id)}
                        disabled={isLoading}
                      >
                        {isLoading === 'delete' ? '...' : 'Elimina'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h2>Informazioni Sistema</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Ultima stampa:</span>
            <span className="info-value">
              {status?.lastPrinted
                ? new Date(status.lastPrinted.printedAt).toLocaleString('it-IT')
                : 'Nessuna'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Job totali in archivio:</span>
            <span className="info-value">{status?.queue?.total || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Aggiornamento automatico:</span>
            <span className="info-value">Ogni 10 secondi</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrinterDiagnostics
