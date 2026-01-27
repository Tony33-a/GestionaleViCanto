import api from './api'

const reportsService = {
  async getDashboard(params = {}) {
    const response = await api.get('/reports/dashboard', { params })
    return response.data.data
  },
  async getOrders(params = {}) {
    const response = await api.get('/reports/orders', { params })
    return response.data
  }
}

export default reportsService
