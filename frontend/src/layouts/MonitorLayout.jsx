import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { socketService } from '../services/socket'
import { useEffect, useState } from 'react'
import MonitorDashboard from '../pages/monitor/Dashboard'
import MonitorOrders from '../pages/monitor/Orders'
import DashboardOrders from '../pages/monitor/DashboardOrders'
import MonitorClosedTables from '../pages/monitor/ClosedTables'
import MonitorTables from '../pages/monitor/Tables'
import MonitorMenuManagement from '../pages/monitor/MenuManagement'
import TabletOrder from '../pages/tablet/Order'
import CategoryProducts from '../pages/tablet/CategoryProducts'
import MonitorWaiters from '../pages/monitor/Waiters'
import PrinterDiagnostics from '../pages/monitor/PrinterDiagnostics'
import '../styles/MonitorLayout.css'

function MonitorLayout() {
  const { user, token, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    socketService.connect(token)
    socketService.joinRoom('monitor')

    return () => {
      socketService.leaveRoom('monitor')
      socketService.disconnect()
    }
  }, [token])

  // Chiudi menu quando cambia pagina
  useEffect(() => {
    setMenuOpen(false)
    setDashboardOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    socketService.disconnect()
    logout()
  }

  const getCurrentPageName = () => {
    if (location.pathname.includes('/tables')) return 'Tavoli'
    if (location.pathname.includes('/order/')) return 'Ordine'
    if (location.pathname.includes('/orders')) return 'Ordini'
    if (location.pathname.includes('/closed-tables')) return 'Tavoli Chiusi'
    if (location.pathname.includes('/statistics')) return 'Statistiche'
    if (location.pathname.includes('/menu-management')) return 'Gestione Menu'
    if (location.pathname.includes('/waiters')) return 'Gestione Camerieri'
    if (location.pathname.includes('/printer')) return 'Diagnostica Stampante'
    return 'Admin'
  }

  return (
    <div className="monitor-layout-new">
      {/* Header con menu a tendina */}
      <header className="monitor-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
          <h1 className="header-title">ViCanto - {getCurrentPageName()}</h1>
        </div>
        <div className="header-right">
          <span className="user-name">{user?.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Esci</button>
        </div>
      </header>

      {/* Menu dropdown */}
      {menuOpen && (
        <div className="dropdown-menu">
          <NavLink to="/monitor/tables" className="dropdown-item">
            Tavoli
          </NavLink>
          
          {/* Dashboard con sottomenu */}
          <div className="dropdown-item-parent">
            <button 
              className="dropdown-item dropdown-toggle"
              onClick={(e) => {
                e.stopPropagation()
                setDashboardOpen(!dashboardOpen)
              }}
            >
              Dashboard {dashboardOpen ? '▲' : '▼'}
            </button>
            {dashboardOpen && (
              <div className="dropdown-submenu">
                <NavLink to="/monitor/statistics" className="dropdown-subitem">
                  Statistiche Ordini
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/monitor/menu-management" className="dropdown-item">
            Gestione Menu
          </NavLink>
          <NavLink to="/monitor/waiters" className="dropdown-item">
            Gestione Camerieri
          </NavLink>
          <NavLink to="/monitor/printer" className="dropdown-item">
            Diagnostica Stampante
          </NavLink>
        </div>
      )}

      {/* Overlay per chiudere menu */}
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Main Content */}
      <main className="monitor-main-new">
        <Routes>
          <Route path="/" element={<Navigate to="/monitor/tables" replace />} />
          <Route path="/tables" element={<MonitorTables />} />
          <Route path="/order/:tableId" element={<TabletOrder />} />
          <Route path="/category/:categoryCode" element={<CategoryProducts />} />
          <Route path="/orders" element={<DashboardOrders />} />
          <Route path="/closed-tables" element={<MonitorClosedTables />} />
          <Route path="/statistics" element={<MonitorDashboard />} />
          <Route path="/menu-management" element={<MonitorMenuManagement />} />
          <Route path="/waiters" element={<MonitorWaiters />} />
          <Route path="/printer" element={<PrinterDiagnostics />} />
        </Routes>
      </main>
    </div>
  )
}

export default MonitorLayout
