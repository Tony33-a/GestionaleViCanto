import api from './api'

const usersService = {
  // Get all users
  getAll: async () => {
    const response = await api.get('/users')
    return response.data.data
  },

  // Create new user
  create: async (userData) => {
    const response = await api.post('/users', userData)
    return response.data.data
  },

  // Update user
  update: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData)
    return response.data.data
  },

  // Deactivate user
  deactivate: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  }
}

export default usersService
