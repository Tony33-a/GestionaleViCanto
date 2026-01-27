import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import tablesService from '../../services/tablesService'
import { socketService } from '../../services/socket'
import TableCard from '../../components/tablet/TableCard'
import { useAuthStore } from '../../stores/authStore'
import './Home.css'

function TabletHome() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('tavoli')
  const [lockError, setLockError] = useState(null)
  const { user } = useAuthStore()

  // Fetch tavoli
  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables'],
    queryFn: tablesService.getAll,
    refetchInterval: 30000, // Refresh ogni 30s come backup
  })

  // Socket.IO listener per aggiornamenti real-time
  useEffect(() => {
    // Aggiorna tavolo quando riceve evento
    const handleTableUpdate = (updatedTable) => {
      console.log('Table updated via socket:', updatedTable)
      queryClient.setQueryData(['tables'], (oldTables) => {
        if (!oldTables) return oldTables
        return oldTables.map(t =>
          t.id === updatedTable.id ? { ...t, ...updatedTable } : t
        )
      })
    }

    // Nuovo ordine - aggiorna tavolo correlato
    const handleOrderNew = (order) => {
      console.log('New order via socket:', order)
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }

    // Ordine completato
    const handleOrderCompleted = (data) => {
      console.log('Order completed via socket:', data)
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
    
    // Se user non è disponibile, naviga direttamente
    if (!user?.id) {
      navigate(`/tablet/order/${table.id}`)
      return
    }
    
    try {
      // Tenta di acquisire il lock sul tavolo
      await tablesService.lock(table.id, user.id)
      // Se il lock ha successo, naviga alla pagina ordine
      navigate(`/tablet/order/${table.id}`)
    } catch (error) {
      // Se errore 423 = tavolo in uso, mostra messaggio
      if (error.message?.includes('in uso')) {
        setLockError(`Tavolo ${table.number} attualmente in uso da un altro utente`)
        setTimeout(() => setLockError(null), 3000)
      } else {
        // Altri errori (es. API non disponibile) - naviga comunque
        console.warn('Lock fallito, navigo comunque:', error.message)
        navigate(`/tablet/order/${table.id}`)
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

      {/* Asporto (placeholder) */}
      {activeTab === 'asporto' && (
        <div className="asporto-section">
          <button
            className="new-asporto-btn"
            onClick={() => navigate('/tablet/order/asporto')}
          >
            + Nuovo Ordine Asporto
          </button>
        </div>
      )}
    </div>
  )
}

export default TabletHome
