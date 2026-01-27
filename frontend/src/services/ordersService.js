import api from './api'

/**
 * Service per gestione ordini
 */
const ordersService = {
  /**
   * Crea nuovo ordine
   * @param {Object} orderData - { tableId, covers, items }
   * @returns {Promise<Object>}
   */
  async create(orderData) {
    console.log('🔍 [STEP 10] ordersService.create chiamato con:', orderData);
    console.log('🔍 [STEP 10] Tipi dati in service:', {
      table_id: typeof orderData.table_id,
      covers: typeof orderData.covers,
      status: typeof orderData.status,
      items: typeof orderData.items,
      itemsLength: orderData.items?.length
    });
    
    const response = await api.post('/orders', orderData)
    console.log('🔍 [STEP 11] Response status:', response.status);
    console.log('🔍 [STEP 11] Response data:', response.data);
    return response.data.data
  },

  /**
   * Ottieni ordine per ID
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const response = await api.get(`/orders/${id}`)
    return response.data.data
  },

  /**
   * Ottieni ordini attivi
   * @returns {Promise<Array>}
   */
  async getActive() {
    const response = await api.get('/orders/active')
    return response.data.data
  },

  /**
   * Ottieni ordini per tavolo
   * @param {number} tableId
   * @returns {Promise<Array>}
   */
  async getByTable(tableId) {
    const response = await api.get(`/orders/table/${tableId}`)
    return response.data.data
  },

  /**
   * Invia ordine (conferma e stampa)
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async send(id) {
    const response = await api.put(`/orders/${id}/send`)
    return response.data.data
  },

  /**
   * Completa ordine
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async complete(id) {
    const response = await api.put(`/orders/${id}/complete`)
    return response.data.data
  },

  /**
   * Cancella ordine (cambia stato a cancelled)
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async cancel(id) {
    const response = await api.put(`/orders/${id}/cancel`)
    return response.data.data
  },

  /**
   * Elimina ordine (hard delete)
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async delete(id) {
    const response = await api.delete(`/orders/${id}`)
    return response.data
  },

  /**
   * Aggiorna items ordine (solo se pending)
   * @param {number} id
   * @param {Object} data - { items, covers }
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const response = await api.put(`/orders/${id}`, data)
    return response.data.data
  },

  /**
   * Aggiungi items a ordine esistente (per comande aggiuntive)
   * @param {number} id
   * @param {Array} items - Array di items da aggiungere
   * @returns {Promise<Object>}
   */
  async addItems(id, items) {
    const response = await api.put(`/orders/${id}/items`, { items })
    return response.data.data
  }
}

export default ordersService
