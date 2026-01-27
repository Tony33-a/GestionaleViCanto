import api from './api'

/**
 * Service per gestione tavoli
 */
const tablesService = {
  /**
   * Ottieni tutti i tavoli
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await api.get('/tables')
    return response.data.data
  },

  /**
   * Ottieni tavolo per ID con ordine corrente
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const response = await api.get(`/tables/${id}`)
    return response.data.data
  },

  /**
   * Aggiorna stato tavolo
   * @param {number} id
   * @param {Object} data - { status, covers, total }
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const response = await api.put(`/tables/${id}`, data)
    return response.data.data
  },

  /**
   * Libera tavolo (reset a free status)
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async free(id) {
    try {
      console.log(`🔍 DEBUG - Frontend: Tentativo di liberare tavolo ${id}`);
      const response = await api.put(`/tables/${id}/free`);
      console.log('🔍 DEBUG - Frontend: Risposta API completa:', response);
      console.log('🔍 DEBUG - Frontend: Risposta status:', response.status);
      console.log('🔍 DEBUG - Frontend: Risposta data:', response.data);
      console.log('🔍 DEBUG - Frontend: Risposta data.success:', response.data?.success);
      console.log('🔍 DEBUG - Frontend: Risposta data.data:', response.data?.data);
      
      if (response.data?.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.error || 'Errore nella risposta del server');
      }
    } catch (error) {
      console.error('❌ DEBUG - Frontend: Errore nella liberazione tavolo:', error);
      console.error('❌ DEBUG - Frontend: Error response:', error.response);
      console.error('❌ DEBUG - Frontend: Error response status:', error.response?.status);
      console.error('❌ DEBUG - Frontend: Error response data:', error.response?.data);
      console.error('❌ DEBUG - Frontend: Error response data error:', error.response?.data?.error);
      console.error('❌ DEBUG - Frontend: Stringify completo errore:', JSON.stringify(error, null, 2));
      
      // Se l'errore ha una response, lancia quello
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Errore sconosciuto durante la liberazione del tavolo');
      }
    }
  },

  /**
   * Blocca tavolo per l'utente corrente
   * @param {number} id - ID tavolo
   * @param {number} userId - ID utente
   * @returns {Promise<Object>}
   */
  async lock(id, userId) {
    try {
      const response = await api.put(`/tables/${id}/lock`, { userId });
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 423) {
        throw new Error('Tavolo attualmente in uso da un altro utente');
      }
      throw error;
    }
  },

  /**
   * Sblocca tavolo
   * @param {number} id - ID tavolo
   * @param {number} userId - ID utente
   * @returns {Promise<Object>}
   */
  async unlock(id, userId) {
    try {
      const response = await api.put(`/tables/${id}/unlock`, { userId });
      return response.data.data;
    } catch (error) {
      console.error('Errore unlock tavolo:', error);
      throw error;
    }
  }
}

export default tablesService
