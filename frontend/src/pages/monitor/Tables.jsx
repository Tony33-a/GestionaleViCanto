import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import tablesService from '../../services/tablesService'
import { socketService } from '../../services/socket'
import TableCard from '../../components/tablet/TableCard'
import { useAuthStore } from '../../stores/authStore'
import '../tablet/Home.css'

function MonitorTables() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('tavoli')
  const [lockError, setLockError] = useState(null)
  const { user } = useAuthStore()

  // Fetch tavoli
  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesService.getAll,
    refetchInterval: 30000,
  })

  // Socket.IO listener per aggiornamenti real-time
  useEffect(() => {
    const handleTableUpdate = (updatedTable) => {
      queryClient.setQueryData(['tables'], (oldTables) => {
        if (!oldTables) return oldTables
        return oldTables.map(t =>
          t.id === updatedTable.id ? { ...t, ...updatedTable } : t
        )
      })
    }

    const handleOrderNew = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }

    const handleOrderCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }

    socketService.on('table:updated', handleTableUpdate)
    socketService.on('order:new', handleOrderNew)
    socketService.on('order:completed', handleOrderCompleted)

    return () => {
      socketService.off('table:updated')
      socketService.off('order:new')
      socketService.off('order:completed')
    }
  }, [queryClient])

  const handleTableClick = async (table) => {
    setLockError(null)
    
    if (!user?.id) {
      navigate(`/monitor/order/${table.id}`)
      return
    }
    
    try {
      await tablesService.lock(table.id, user.id)
      navigate(`/monitor/order/${table.id}`)
    } catch (error) {
      if (error.message?.includes('in uso')) {
        setLockError(`Tavolo ${table.number} attualmente in uso da un altro utente`)
        setTimeout(() => setLockError(null), 3000)
      } else {
        navigate(`/monitor/order/${table.id}`)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="tablet-home">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento tavoli...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tablet-home">
        <div className="error-state">
          <p>Errore nel caricamento dei tavoli</p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['tables'] })}>
            Riprova
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tablet-home">
      {/* Tabs */}
      <div className="home-tabs">
        <button
          className={`tab-btn ${activeTab === 'tavoli' ? 'active' : ''}`}
          onClick={() => setActiveTab('tavoli')}
        >
          TAVOLI
        </button>
        <button
          className={`tab-btn ${activeTab === 'asporto' ? 'active' : ''}`}
          onClick={() => setActiveTab('asporto')}
        >
          ASPORTO
        </button>
      </div>

      {/* Alert errore lock */}
      {lockError && (
        <div className="lock-error-alert">
          {lockError}
        </div>
      )}

      {/* Alert per comande in attesa */}
      {tables.some(t => t.status === 'pending') && (
        <div className="pending-alert">
          Comanda inviata per Tavolo {tables.find(t => t.status === 'pending')?.number}!
        </div>
      )}

      {/* Griglia Tavoli */}
      {activeTab === 'tavoli' && (
        <div className="tables-grid">
          {tables
            .sort((a, b) => a.number - b.number)
            .map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={handleTableClick}
              />
            ))}
        </div>
      )}

      {/* Asporto */}
      {activeTab === 'asporto' && (
        <div className="asporto-section">
          <button
            className="new-asporto-btn"
            onClick={() => navigate('/monitor/order/asporto')}
          >
            + Nuovo Ordine Asporto
          </button>
        </div>
      )}
    </div>
  )
}

export default MonitorTables
