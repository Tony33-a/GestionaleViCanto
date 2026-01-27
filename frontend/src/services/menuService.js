import api from './api'

/**
 * Service per gestione menu (categorie, prodotti, gusti, supplementi)
 */
const menuService = {
  /**
   * Ottieni menu completo (categorie con gusti + supplementi)
   * @returns {Promise<Object>} - { categories, supplements }
   */
  async getFullMenu() {
    const response = await api.get('/menu/full')
    return response.data.data
  },

  /**
   * Ottieni tutte le categorie
   * @returns {Promise<Array>}
   */
  async getCategories() {
    const response = await api.get('/menu/categories')
    return response.data.data
  },

  /**
   * Ottieni categoria con gusti
   * @param {string} code - es: 'coppetta', 'cono'
   * @returns {Promise<Object>}
   */
  async getCategoryByCode(code) {
    const response = await api.get(`/menu/categories/${code}`)
    return response.data.data
  },

  /**
   * Crea nuova categoria
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  async createCategory(categoryData) {
    const response = await api.post('/menu/categories', categoryData)
    return response.data.data
  },

  /**
   * Aggiorna categoria
   * @param {number} id
   * @param {Object} categoryData
   * @returns {Promise<Object>}
   */
  async updateCategory(id, categoryData) {
    const response = await api.put(`/menu/categories/${id}`, categoryData)
    return response.data.data
  },

  /**
   * Elimina categoria
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteCategory(id) {
    await api.delete(`/menu/categories/${id}`)
  },

  /**
   * Ottieni prodotti per categoria
   * @param {string} categoryCode
   * @returns {Promise<Array>}
   */
  async getProductsByCategory(categoryCode) {
    const response = await api.get(`/menu/products/${categoryCode}`)
    return response.data.data
  },

  /**
   * Ottieni tutti i prodotti
   * @returns {Promise<Array>}
   */
  async getAllProducts() {
    const response = await api.get('/menu/products')
    return response.data.data
  },

  /**
   * Crea nuovo prodotto
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  async createProduct(productData) {
    const response = await api.post('/menu/products', productData)
    return response.data.data
  },

  /**
   * Aggiorna prodotto
   * @param {number} id
   * @param {Object} productData
   * @returns {Promise<Object>}
   */
  async updateProduct(id, productData) {
    const response = await api.put(`/menu/products/${id}`, productData)
    return response.data.data
  },

  /**
   * Elimina prodotto
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteProduct(id) {
    await api.delete(`/menu/products/${id}`)
  },

  /**
   * Ottieni tutti i gusti
   * @returns {Promise<Array>}
   */
  async getFlavors() {
    const response = await api.get('/menu/flavors')
    return response.data.data
  },

  /**
   * Ottieni gusti per categoria
   * @param {string} categoryCode
   * @returns {Promise<Array>}
   */
  async getFlavorsByCategory(categoryCode) {
    const response = await api.get(`/menu/flavors/${categoryCode}`)
    return response.data.data
  },

  /**
   * Crea nuovo gusto
   * @param {Object} flavorData
   * @returns {Promise<Object>}
   */
  async createFlavor(flavorData) {
    const response = await api.post('/menu/flavors', flavorData)
    return response.data.data
  },

  /**
   * Aggiorna gusto
   * @param {number} id
   * @param {Object} flavorData
   * @returns {Promise<Object>}
   */
  async updateFlavor(id, flavorData) {
    const response = await api.put(`/menu/flavors/${id}`, flavorData)
    return response.data.data
  },

  /**
   * Elimina gusto
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteFlavor(id) {
    await api.delete(`/menu/flavors/${id}`)
  },

  /**
   * Ottieni tutti i supplementi
   * @returns {Promise<Array>}
   */
  async getSupplements() {
    const response = await api.get('/menu/supplements')
    return response.data.data
  },

  /**
   * Crea nuovo supplemento
   * @param {Object} supplementData
   * @returns {Promise<Object>}
   */
  async createSupplement(supplementData) {
    const response = await api.post('/menu/supplements', supplementData)
    return response.data.data
  },

  /**
   * Aggiorna supplemento
   * @param {number} id
   * @param {Object} supplementData
   * @returns {Promise<Object>}
   */
  async updateSupplement(id, supplementData) {
    const response = await api.put(`/menu/supplements/${id}`, supplementData)
    return response.data.data
  },

  /**
   * Elimina supplemento
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteSupplement(id) {
    await api.delete(`/menu/supplements/${id}`)
  },

  // ===== ASSOCIAZIONI PRODOTTO-SUPPLEMENTO =====

  /**
   * Ottieni tutte le associazioni prodotto-supplemento
   * @returns {Promise<Array>}
   */
  async getAllProductSupplementAssociations() {
    const response = await api.get('/product-supplements')
    return response.data.data
  },

  /**
   * Ottieni prodotti associati a un supplemento
   * @param {number} supplementId
   * @returns {Promise<Array>}
   */
  async getProductsForSupplement(supplementId) {
    const response = await api.get(`/product-supplements/supplements/${supplementId}/products`)
    return response.data.data
  },

  /**
   * Ottieni supplementi associati a un prodotto
   * @param {number} productId
   * @returns {Promise<Array>}
   */
  async getSupplementsForProduct(productId) {
    const response = await api.get(`/product-supplements/products/${productId}/supplements`)
    return response.data.data
  },

  /**
   * Imposta prodotti per un supplemento (sostituisce esistenti)
   * @param {number} supplementId
   * @param {Array<number>} productIds
   * @returns {Promise<void>}
   */
  async setProductsForSupplement(supplementId, productIds) {
    await api.put(`/product-supplements/supplements/${supplementId}/products`, { productIds })
  },

  /**
   * Aggiungi supplemento a prodotto
   * @param {number} productId
   * @param {number} supplementId
   * @returns {Promise<void>}
   */
  async addSupplementToProduct(productId, supplementId) {
    await api.post(`/product-supplements/products/${productId}/supplements/${supplementId}`)
  },

  /**
   * Rimuovi supplemento da prodotto
   * @param {number} productId
   * @param {number} supplementId
   * @returns {Promise<void>}
   */
  async removeSupplementFromProduct(productId, supplementId) {
    await api.delete(`/product-supplements/products/${productId}/supplements/${supplementId}`)
  }
}

export default menuService
