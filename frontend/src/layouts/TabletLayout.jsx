import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { socketService } from '../services/socket'
import { useEffect } from 'react'
import TabletHome from '../pages/tablet/Home'
import TabletOrder from '../pages/tablet/Order'
import CategoryProducts from '../pages/tablet/CategoryProducts'
import '../styles/TabletLayout.css'

function TabletLayout() {
  const { user, token, logout } = useAuthStore()
  const location = useLocation()

  // Determina se siamo in una pagina full-screen (nasconde header)
  const isOrderPage = location.pathname.includes('/order/') || location.pathname.includes('/category/')

  useEffect(() => {
    // Connetti Socket.IO per tablet
    socketService.connect(token)
    socketService.joinRoom('tablets')

    return () => {
      socketService.leaveRoom('tablets')
      socketService.disconnect()
    }
  }, [token])

  const handleLogout = () => {
    socketService.disconnect()
    logout()
  }

  return (
    <div className="tablet-layout">
      {/* Header con info cameriere - nascosto in pagina ordine */}
      {!isOrderPage && (
        <header className="tablet-header">
          <div className="header-left">
            <h1>ViCanto</h1>
          </div>
          <div className="header-right">
            <span className="waiter-name">{user?.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Esci
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`tablet-main ${isOrderPage ? 'full-height' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/tablet/home" replace />} />
          <Route path="/home" element={<TabletHome />} />
          <Route path="/order/:tableId" element={<TabletOrder />} />
          <Route path="/category/:categoryCode" element={<CategoryProducts />} />
        </Routes>
      </main>
    </div>
  )
}

export default TabletLayout
