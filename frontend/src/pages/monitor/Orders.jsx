import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import reportsService from '../../services/reportsService'
import ordersService from '../../services/ordersService'
import './Dashboard.css'

function MonitorOrders() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Ordini</h1>
        <p>Test pagina - componente minimo</p>
      </div>
      <div style={{ padding: 20, background: '#f0f0f0' }}>
        <p>Se vedi questo, il routing funziona.</p>
        <p>Ora aggiungerò il codice completo...</p>
      </div>
    </div>
  )
}

export default MonitorOrders
