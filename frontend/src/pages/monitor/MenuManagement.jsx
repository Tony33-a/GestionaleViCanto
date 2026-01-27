import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import menuService from '../../services/menuService'
import { useAuthStore } from '../../stores/authStore'
import './Dashboard.css'

function MonitorMenuManagement() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [activeTab, setActiveTab] = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSupplement, setSelectedSupplement] = useState(null)
  const [selectedFlavor, setSelectedFlavor] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list', 'category-detail', 'product-detail', 'supplement-detail', 'flavor-detail'
  const [editingItem, setEditingItem] = useState(null) // { type: 'flavor' | 'category' | 'product' | 'supplement', data: {} }
  const [editForm, setEditForm] = useState({})
  const [creatingItem, setCreatingItem] = useState(null) // { type: 'flavor' | 'category' | 'product' | 'supplement' }
  const [createForm, setCreateForm] = useState({})
  const [createSupplementProductIds, setCreateSupplementProductIds] = useState([]) // Prodotti per nuovo supplemento
  const [data, setData] = useState({
    categories: [],
    products: [],
    supplements: [],
    flavors: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // State per gestione associazioni prodotto-supplemento
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [associatedProductIds, setAssociatedProductIds] = useState([])
  const [savingAssociations, setSavingAssociations] = useState(false)
  const [hasDbAssociations, setHasDbAssociations] = useState(false) // true se ci sono associazioni nel DB

  // Verifica autenticazione
  useEffect(() => {
    if (!token) {
      setError('Utente non autenticato. Effettua il login per accedere alla gestione menu.')
      return
    }
  }, [token])

  // Funzione per caricare tutti i dati dal database reale
  const fetchData = async () => {
    if (!token) {
      setError('Utente non autenticato. Effettua il login per accedere alla gestione menu.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      // Carica dati reali dal backend
      const [categories, products, supplements, flavors] = await Promise.all([
        menuService.getCategories().catch(() => []),
        menuService.getAllProducts().catch(() => []),
        menuService.getSupplements().catch(() => []),
        menuService.getFlavors().catch(() => [])
      ])

      setData({
        categories: categories || [],
        products: products || [],
        supplements: supplements || [],
        flavors: flavors || []
      })
    } catch (err) {
      console.error('Errore generale fetch data:', err)
      if (err.response?.status === 401) {
        setError('Sessione scaduta. Effettua nuovamente il login.')
      } else if (err.response?.status === 403) {
        setError('Non hai i permessi per accedere a queste funzionalità.')
      } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('Impossibile connettersi al server. Assicurati che il backend sia in esecuzione.')
      } else {
        setError(`Errore nel caricamento dei dati: ${err.message || 'Errore sconosciuto'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Funzione per aggiornare i dati (refresh)
  const refreshData = () => {
    fetchData()
  }

  // Carica dati al montaggio
  useEffect(() => {
    setTimeout(() => fetchData(), 100)
  }, [])

  // Funzioni di navigazione
  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    setViewMode('category-detail')
  }

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setViewMode('product-detail')
  }

  const handleBackToList = () => {
    setSelectedCategory(null)
    setSelectedProduct(null)
    setViewMode('list')
  }

  const handleBackToCategory = () => {
    setSelectedProduct(null)
    setViewMode('category-detail')
  }

  const handleSupplementClick = async (supplement) => {
    setSelectedSupplement(supplement)
    setViewMode('supplement-detail')
    // Carica le associazioni dal database
    try {
      const products = await menuService.getProductsForSupplement(supplement.id)
      const productIds = products.map(p => p.id)
      setAssociatedProductIds(productIds)
      setHasDbAssociations(productIds.length > 0) // Flag per sapere se usare DB o fallback
    } catch (err) {
      console.error('Errore caricamento associazioni:', err)
      setAssociatedProductIds([])
      setHasDbAssociations(false)
    }
  }

  const handleBackToSupplements = () => {
    setSelectedSupplement(null)
    setAssociatedProductIds([])
    setHasDbAssociations(false)
    setViewMode('list')
    setActiveTab('supplements')
  }

  const handleFlavorClick = (flavor) => {
    setSelectedFlavor(flavor)
    setViewMode('flavor-detail')
  }

  const handleBackToFlavors = () => {
    setSelectedFlavor(null)
    setViewMode('list')
    setActiveTab('flavors')
  }

  // Funzioni per gestione associazioni prodotto-supplemento
  const handleOpenProductsModal = () => {
    // Se non ci sono associazioni DB, pre-seleziona i prodotti dal fallback hardcoded
    if (!hasDbAssociations && selectedSupplement) {
      const supplementName = selectedSupplement.name?.toLowerCase() || ''
      const supplementCode = selectedSupplement.code || ''
      const altroNoSupplements = ['affogato al caffe', 'frutta di stagione', 'sgroppino', 'spaghetti ice']

      const fallbackIds = data.products.filter(product => {
        const categoryCode = product.category_code
        const productCode = product.code
        const productName = product.name?.toLowerCase() || ''

        if (categoryCode === 'CAT_BEVANDE') {
          if (productCode === 'BEV_CORONA') {
            return supplementCode === 'SUPP_SALE_LIMONE' || supplementName.includes('sale e limone')
          }
          return false
        }
        if (categoryCode === 'CAT_PATATINE') return false
        if (altroNoSupplements.some(name => productName.includes(name.toLowerCase()))) return false
        if (categoryCode === 'CAT_GRANITE') {
          return supplementName.startsWith('topping') &&
                 !supplementName.includes('caramello') &&
                 !supplementName.includes('cioccolato bianco')
        }
        if (supplementCode === 'SUPP_SALE_LIMONE' || supplementName.includes('sale e limone')) {
          return productCode === 'BEV_CORONA'
        }
        return true
      }).map(p => p.id)

      setAssociatedProductIds(fallbackIds)
    }
    setShowProductsModal(true)
  }

  const handleCloseProductsModal = () => {
    setShowProductsModal(false)
  }

  const handleToggleProduct = (productId) => {
    setAssociatedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleSaveProductAssociations = async () => {
    if (!selectedSupplement) return

    setSavingAssociations(true)
    try {
      await menuService.setProductsForSupplement(selectedSupplement.id, associatedProductIds)
      setHasDbAssociations(associatedProductIds.length > 0) // Aggiorna il flag
      setSuccess('Associazioni aggiornate con successo!')
      setTimeout(() => setSuccess(''), 3000)
      setShowProductsModal(false)
    } catch (err) {
      console.error('Errore salvataggio associazioni:', err)
      setError('Errore nel salvataggio delle associazioni')
    } finally {
      setSavingAssociations(false)
    }
  }

  // Funzioni CRUD per categorie
  const handleCreateCategory = async (categoryData) => {
    try {
      await menuService.createCategory(categoryData)
      await fetchData() // Ricarica i dati
      setSuccess('Categoria creata con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nella creazione della categoria')
      console.error(err)
    }
  }

  const handleUpdateCategory = async (id, categoryData) => {
    try {
      await menuService.updateCategory(id, categoryData)
      await fetchData() // Ricarica i dati
      setSuccess('Categoria aggiornata con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nell\'aggiornamento della categoria')
      console.error(err)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
      try {
        await menuService.deleteCategory(id)
        await fetchData() // Ricarica i dati
        setSuccess('Categoria eliminata con successo!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError('Errore nell\'eliminazione della categoria')
        console.error(err)
      }
    }
  }

  // Funzioni CRUD per prodotti
  const handleCreateProduct = async (productData) => {
    try {
      await menuService.createProduct(productData)
      await fetchData() // Ricarica i dati
      setSuccess('Prodotto creato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nella creazione del prodotto')
      console.error(err)
    }
  }

  const handleUpdateProduct = async (id, productData) => {
    try {
      await menuService.updateProduct(id, productData)
      await fetchData() // Ricarica i dati
      setSuccess('Prodotto aggiornato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nell\'aggiornamento del prodotto')
      console.error(err)
    }
  }

  const handleDeleteProduct = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      try {
        await menuService.deleteProduct(id)
        await fetchData() // Ricarica i dati
        setSuccess('Prodotto eliminato con successo!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError('Errore nell\'eliminazione del prodotto')
        console.error(err)
      }
    }
  }

  // Funzioni CRUD per gusti
  const handleCreateFlavor = async (flavorData) => {
    try {
      await menuService.createFlavor(flavorData)
      await fetchData() // Ricarica i dati
      setSuccess('Gusto creato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nella creazione del gusto')
      console.error(err)
    }
  }

  const handleUpdateFlavor = async (id, flavorData) => {
    try {
      await menuService.updateFlavor(id, flavorData)
      await fetchData() // Ricarica i dati
      setSuccess('Gusto aggiornato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nell\'aggiornamento del gusto')
      console.error(err)
    }
  }

  const handleDeleteFlavor = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo gusto?')) {
      try {
        await menuService.deleteFlavor(id)
        await fetchData() // Ricarica i dati
        setSuccess('Gusto eliminato con successo!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError('Errore nell\'eliminazione del gusto')
        console.error(err)
      }
    }
  }

  // Funzioni di gestione modifica
  const handleEditItem = (type, item) => {
    setEditingItem({ type, data: item })
    setEditForm({ ...item })
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditForm({})
  }

  const handleSaveEdit = async () => {
    try {
      if (editingItem.type === 'flavor') {
        await handleUpdateFlavor(editingItem.data.id, editForm)
      } else if (editingItem.type === 'category') {
        await handleUpdateCategory(editingItem.data.id, editForm)
      } else if (editingItem.type === 'product') {
        await handleUpdateProduct(editingItem.data.id, editForm)
      } else if (editingItem.type === 'supplement') {
        await handleUpdateSupplement(editingItem.data.id, editForm)
      }
      handleCancelEdit()
    } catch (err) {
      console.error('Errore salvataggio:', err)
    }
  }

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  // Funzioni per gestione creazione
  const handleOpenCreate = (type) => {
    setCreatingItem({ type })
    // Inizializza form con valori di default
    if (type === 'category') {
      setCreateForm({ name: '', code: '', display_order: 0, is_active: true })
    } else if (type === 'product') {
      setCreateForm({
        name: '',
        code: '',
        category_code: selectedCategory?.code || '',
        price: 0,
        display_order: 0,
        has_flavors: true,
        is_available: true
      })
    } else if (type === 'flavor') {
      setCreateForm({ name: '', category_code: '', display_order: 0, is_available: true })
    } else if (type === 'supplement') {
      setCreateForm({ name: '', code: '', price: 0, display_order: 0, is_available: true })
      // Pre-seleziona tutti i prodotti (escluse bevande e patatine) come default
      const defaultProductIds = data.products.filter(p =>
        p.category_code !== 'CAT_BEVANDE' && p.category_code !== 'CAT_PATATINE'
      ).map(p => p.id)
      setCreateSupplementProductIds(defaultProductIds)
    }
  }

  const handleCancelCreate = () => {
    setCreatingItem(null)
    setCreateForm({})
    setCreateSupplementProductIds([])
  }

  const handleCreateFormChange = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveCreate = async () => {
    try {
      if (creatingItem.type === 'category') {
        await handleCreateCategory(createForm)
      } else if (creatingItem.type === 'product') {
        await handleCreateProduct(createForm)
      } else if (creatingItem.type === 'flavor') {
        await handleCreateFlavor(createForm)
      } else if (creatingItem.type === 'supplement') {
        await handleCreateSupplement(createForm, createSupplementProductIds)
      }
      handleCancelCreate()
    } catch (err) {
      console.error('Errore creazione:', err)
    }
  }

  // Toggle prodotto per creazione supplemento
  const handleToggleCreateSupplementProduct = (productId) => {
    setCreateSupplementProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }
  const handleCreateSupplement = async (supplementData, productIds = []) => {
    try {
      const newSupplement = await menuService.createSupplement(supplementData)
      // Salva le associazioni con i prodotti
      if (productIds.length > 0 && newSupplement?.id) {
        await menuService.setProductsForSupplement(newSupplement.id, productIds)
      }
      await fetchData() // Ricarica i dati
      setCreateSupplementProductIds([]) // Reset
      setSuccess('Supplemento creato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nella creazione del supplemento')
      console.error(err)
    }
  }

  const handleUpdateSupplement = async (id, supplementData) => {
    try {
      await menuService.updateSupplement(id, supplementData)
      await fetchData() // Ricarica i dati
      setSuccess('Supplemento aggiornato con successo!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Errore nell\'aggiornamento del supplemento')
      console.error(err)
    }
  }

  const handleDeleteSupplement = async (id) => {
    if (confirm('Sei sicuro di voler eliminare questo supplemento?')) {
      try {
        await menuService.deleteSupplement(id)
        await fetchData() // Ricarica i dati
        setSuccess('Supplemento eliminato con successo!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError('Errore nell\'eliminazione del supplemento')
        console.error(err)
      }
    }
  }

  // Prodotti filtrati per categoria selezionata
  const categoryProducts = selectedCategory
    ? data.products.filter(p => p.category_code === selectedCategory.code)
    : []

  // Supplementi filtrati per prodotto selezionato (stessa logica di ProductModal)
  const availableSupplements = useMemo(() => {
    if (!selectedProduct) return []

    const isBevanda = selectedProduct.category_code === 'CAT_BEVANDE'
    const isPatatine = selectedProduct.category_code === 'CAT_PATATINE'
    const isGranite = selectedProduct.category_code === 'CAT_GRANITE'
    const isCorona = selectedProduct.code === 'BEV_CORONA'

    // Prodotti categoria Altro senza supplementi
    const altroNoSupplements = ['affogato al caffe', 'frutta di stagione', 'sgroppino', 'spaghetti ice']
    const isAltroNoSupp = altroNoSupplements.some(name =>
      selectedProduct.name?.toLowerCase().includes(name.toLowerCase())
    )

    if (isBevanda && !isCorona) {
      // Bevande (tranne Corona): nessun supplemento
      return []
    }
    if (isPatatine) {
      // Patatine: nessun supplemento
      return []
    }
    if (isAltroNoSupp) {
      // Prodotti Altro specifici: nessun supplemento
      return []
    }
    if (isGranite) {
      // Granite: solo supplementi che iniziano per "topping", esclusi caramello e cioccolato bianco
      return data.supplements.filter(s => {
        const name = s.name.toLowerCase()
        return name.startsWith('topping') &&
               !name.includes('caramello') &&
               !name.includes('cioccolato bianco')
      })
    }
    if (isCorona) {
      // Corona: solo Sale e limone
      return data.supplements.filter(s => s.code === 'SUPP_SALE_LIMONE' || s.name.toLowerCase().includes('sale e limone'))
    }
    // Altri prodotti: tutti i supplementi
    return data.supplements
  }, [selectedProduct, data.supplements])

  // Prodotti associati al supplemento selezionato (da database con fallback hardcoded)
  const productsForSupplement = useMemo(() => {
    if (!selectedSupplement) return []

    // Se ci sono associazioni nel database, usale
    if (hasDbAssociations) {
      return data.products.filter(p => associatedProductIds.includes(p.id))
    }

    // Fallback: logica hardcoded (stessa di ProductModal.jsx)
    const supplementName = selectedSupplement.name?.toLowerCase() || ''
    const supplementCode = selectedSupplement.code || ''

    // Prodotti che NON accettano supplementi
    const altroNoSupplements = ['affogato al caffe', 'frutta di stagione', 'sgroppino', 'spaghetti ice']

    return data.products.filter(product => {
      const categoryCode = product.category_code
      const productCode = product.code
      const productName = product.name?.toLowerCase() || ''

      // Bevande: nessun supplemento (tranne Corona con Sale e limone)
      if (categoryCode === 'CAT_BEVANDE') {
        if (productCode === 'BEV_CORONA') {
          return supplementCode === 'SUPP_SALE_LIMONE' || supplementName.includes('sale e limone')
        }
        return false
      }

      // Patatine: nessun supplemento
      if (categoryCode === 'CAT_PATATINE') return false

      // Prodotti "Altro" specifici: nessun supplemento
      if (altroNoSupplements.some(name => productName.includes(name.toLowerCase()))) {
        return false
      }

      // Granite: solo topping (esclusi caramello e cioccolato bianco)
      if (categoryCode === 'CAT_GRANITE') {
        return supplementName.startsWith('topping') &&
               !supplementName.includes('caramello') &&
               !supplementName.includes('cioccolato bianco')
      }

      // Sale e limone: solo Corona
      if (supplementCode === 'SUPP_SALE_LIMONE' || supplementName.includes('sale e limone')) {
        return productCode === 'BEV_CORONA'
      }

      // Altri supplementi: tutti i prodotti rimanenti
      return true
    })
  }, [selectedSupplement, data.products, associatedProductIds, hasDbAssociations])

  // Gusti unici (raggruppati per nome, con lista di categorie associate)
  const uniqueFlavors = useMemo(() => {
    const flavorsByName = {}

    data.flavors.forEach(flavor => {
      const name = flavor.name?.trim().toLowerCase()
      if (!name) return

      if (!flavorsByName[name]) {
        flavorsByName[name] = {
          id: flavor.id, // Usa il primo ID come riferimento
          name: flavor.name,
          is_available: flavor.is_available,
          display_order: flavor.display_order,
          category_codes: [],
          originalFlavors: [] // Mantieni riferimento a tutti i record originali
        }
      }

      // Aggiungi la categoria se non già presente
      if (flavor.category_code && !flavorsByName[name].category_codes.includes(flavor.category_code)) {
        flavorsByName[name].category_codes.push(flavor.category_code)
      }

      // Se uno dei gusti è disponibile, il gusto aggregato è disponibile
      if (flavor.is_available) {
        flavorsByName[name].is_available = true
      }

      flavorsByName[name].originalFlavors.push(flavor)
    })

    // Converti in array e ordina per nome
    return Object.values(flavorsByName).sort((a, b) => a.name.localeCompare(b.name))
  }, [data.flavors])

  // Prodotti associati al gusto selezionato (prodotti con has_flavors=true nelle categorie del gusto)
  const productsForFlavor = useMemo(() => {
    if (!selectedFlavor) return []

    // Se il gusto non ha categorie associate, mostra tutti i prodotti con has_flavors=true
    if (!selectedFlavor.category_codes || selectedFlavor.category_codes.length === 0) {
      return data.products.filter(p => p.has_flavors === true)
    }

    // Altrimenti mostra i prodotti delle categorie associate con has_flavors=true
    return data.products.filter(p =>
      p.has_flavors === true && selectedFlavor.category_codes.includes(p.category_code)
    )
  }, [selectedFlavor, data.products])

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestione Menu</h1>
          <p>
            {viewMode === 'list' && 'Configura categorie, gusti e supplementi'}
            {viewMode === 'category-detail' && `Categoria: ${selectedCategory?.name}`}
            {viewMode === 'product-detail' && `Prodotto: ${selectedProduct?.name}`}
            {viewMode === 'supplement-detail' && `Supplemento: ${selectedSupplement?.name}`}
            {viewMode === 'flavor-detail' && `Gusto: ${selectedFlavor?.name}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="back-button-red"
            onClick={() => {
              if (viewMode === 'list') {
                navigate('/monitor/statistics')
              } else {
                handleBackToList()
              }
            }}
          >
            ← {viewMode === 'list' ? 'Indietro' : 'Menu Principale'}
          </button>
          <button 
            className="refresh-button"
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? '🔄 Aggiornamento...' : '🔄 Aggiorna Dati'}
          </button>
          {(viewMode !== 'list') && (
            <button 
              className="back-button-blue"
              onClick={viewMode === 'product-detail' || viewMode === 'supplements' ? handleBackToCategory : handleBackToList}
            >
              ← Torna indietro
            </button>
          )}
        </div>
      </div>

      {/* Messaggi di stato */}
      {error && (
        <div className="dashboard-error">
          {error}
          {!token && (
            <button 
              className="btn-add" 
              style={{ marginTop: '12px', marginLeft: '16px' }}
              onClick={() => navigate('/login')}
            >
              🔄 Vai al Login
            </button>
          )}
        </div>
      )}
      {success && <div className="dashboard-success">{success}</div>}

      {/* Mostra stato autenticazione */}
      {!token && (
        <div className="menu-content" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>🔐 Autenticazione Richiesta</h2>
          <p>Devi effettuare il login per accedere alla gestione menu.</p>
          <button 
            className="btn-add" 
            onClick={() => navigate('/login')}
          >
            🔄 Vai al Login
          </button>
        </div>
      )}

      {/* Mostra contenuto solo se autenticato */}
      {token && viewMode === 'list' && (
        <>
          {/* Tabs di navigazione */}
          <div className="menu-tabs">
            <button
              className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              📁 Categorie
              <span className="tab-badge">{data.categories?.length || 0}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'flavors' ? 'active' : ''}`}
              onClick={() => setActiveTab('flavors')}
            >
              🎨 Gusti
              <span className="tab-badge">{data.flavors?.length || 0}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'supplements' ? 'active' : ''}`}
              onClick={() => setActiveTab('supplements')}
            >
              ➕ Supplementi
              <span className="tab-badge">{data.supplements?.length || 0}</span>
            </button>
          </div>

          {/* Contenuto delle tabs */}
          <div className="menu-content">
            {activeTab === 'categories' && (
              <div className="menu-section">
                <div className="section-header">
                  <h2>📁 Categorie Prodotti</h2>
                  <button className="btn-add-inline" onClick={() => handleOpenCreate('category')}>+ Nuova Categoria</button>
                </div>
                <div className="menu-list">
                  {data.categories.length === 0 ? (
                    <p className="empty-state">Nessuna categoria trovata</p>
                  ) : (
                    data.categories.map(category => (
                      <div
                        key={category.id}
                        className="menu-item clickable"
                        onClick={() => handleCategoryClick(category)}
                      >
                        <div className="menu-item-info">
                          <h3>{category.name}</h3>
                          <p>{data.products.filter(p => p.category_code === category.code).length} prodotti</p>
                        </div>
                        <div className="menu-item-actions">
                          <button className="btn-action btn-action-edit" title="Modifica" onClick={(e) => { e.stopPropagation(); handleEditItem('category', category); }}>✏️</button>
                          <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => { e.stopPropagation(); handleCategoryClick(category); }}>🔍</button>
                          <button className="btn-action btn-action-delete" title="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'flavors' && (
              <div className="menu-section">
                <div className="section-header">
                  <h2>🎨 Gusti</h2>
                  <button className="btn-add-inline" onClick={() => handleOpenCreate('flavor')}>+ Nuovo Gusto</button>
                </div>
                <div className="menu-list">
                  {uniqueFlavors.length === 0 ? (
                    <p className="empty-state">Nessun gusto trovato</p>
                  ) : (
                    uniqueFlavors.map(flavor => {
                      const categoriesCount = flavor.category_codes?.length || 0
                      const associatedProductsCount = flavor.category_codes?.length > 0
                        ? data.products.filter(p => p.has_flavors === true && flavor.category_codes.includes(p.category_code)).length
                        : data.products.filter(p => p.has_flavors === true).length
                      return (
                        <div
                          key={flavor.id}
                          className="menu-item clickable"
                          onClick={() => handleFlavorClick(flavor)}
                        >
                          <div className="menu-item-info">
                            <h3>{flavor.name}</h3>
                            <p>{categoriesCount} {categoriesCount === 1 ? 'categoria' : 'categorie'} • {associatedProductsCount} prodotti • {flavor.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                          </div>
                          <div className="menu-item-actions">
                            <button className="btn-action btn-action-edit" title="Modifica" onClick={(e) => { e.stopPropagation(); handleEditItem('flavor', flavor); }}>✏️</button>
                            <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => { e.stopPropagation(); handleFlavorClick(flavor); }}>🔍</button>
                            <button className="btn-action btn-action-delete" title="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteFlavor(flavor.id); }}>🗑️</button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'supplements' && (
              <div className="menu-section">
                <div className="section-header">
                  <h2>➕ Supplementi</h2>
                  <button className="btn-add-inline" onClick={() => handleOpenCreate('supplement')}>+ Nuovo Supplemento</button>
                </div>
                <div className="menu-list">
                  {data.supplements.length === 0 ? (
                    <p className="empty-state">Nessun supplemento trovato</p>
                  ) : (
                    data.supplements.map(supplement => (
                      <div
                        key={supplement.id}
                        className="menu-item clickable"
                        onClick={() => handleSupplementClick(supplement)}
                      >
                        <div className="menu-item-info">
                          <h3>{supplement.name}</h3>
                          <p>€{parseFloat(supplement.price).toFixed(2)} • {supplement.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                        </div>
                        <div className="menu-item-actions">
                          <button className="btn-action btn-action-edit" title="Modifica" onClick={(e) => { e.stopPropagation(); handleEditItem('supplement', supplement); }}>✏️</button>
                          <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => { e.stopPropagation(); handleSupplementClick(supplement); }}>🔍</button>
                          <button className="btn-action btn-action-delete" title="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteSupplement(supplement.id); }}>🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modale Modifica */}
      {editingItem && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingItem.type === 'flavor' && '✏️ Modifica Gusto'}
                {editingItem.type === 'category' && '✏️ Modifica Categoria'}
                {editingItem.type === 'product' && '✏️ Modifica Prodotto'}
                {editingItem.type === 'supplement' && '✏️ Modifica Supplemento'}
              </h3>
              <button className="modal-close" onClick={handleCancelEdit}>✕</button>
            </div>
            
            <div className="modal-body">
              {editingItem.type === 'flavor' && (
                <>
                  <div className="form-group">
                    <label>Nome Gusto:</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="es: Cioccolato"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria:</label>
                    <select
                      value={editForm.category_code || ''}
                      onChange={(e) => handleFormChange('category_code', e.target.value)}
                    >
                      <option value="">Seleziona categoria</option>
                      {data.categories.map(cat => (
                        <option key={cat.id} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Prezzo (opzionale):</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editForm.price || ''}
                      onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || null)}
                      placeholder="es: 0.50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine:</label>
                    <input
                      type="number"
                      value={editForm.display_order || 0}
                      onChange={(e) => handleFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editForm.is_available || false}
                        onChange={(e) => handleFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>
                </>
              )}

              {editingItem.type === 'category' && (
                <>
                  <div className="form-group">
                    <label>Nome Categoria:</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="es: Coni"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={editForm.code || ''}
                      onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: CAT_CONI"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine:</label>
                    <input
                      type="number"
                      value={editForm.display_order || 0}
                      onChange={(e) => handleFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editForm.is_active || false}
                        onChange={(e) => handleFormChange('is_active', e.target.checked)}
                      />
                      Attiva
                    </label>
                  </div>
                </>
              )}

              {editingItem.type === 'product' && (
                <>
                  <div className="form-group">
                    <label>Nome Prodotto:</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="es: Cono piccolo"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={editForm.code || ''}
                      onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: CONO_PICCOLO"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria:</label>
                    <select
                      value={editForm.category_code || ''}
                      onChange={(e) => handleFormChange('category_code', e.target.value)}
                    >
                      <option value="">Seleziona categoria</option>
                      {data.categories.map(cat => (
                        <option key={cat.id} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Prezzo:</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editForm.price || ''}
                      onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="es: 3.50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine:</label>
                    <input
                      type="number"
                      value={editForm.display_order || 0}
                      onChange={(e) => handleFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editForm.has_flavors || false}
                        onChange={(e) => handleFormChange('has_flavors', e.target.checked)}
                      />
                      Ha gusti
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editForm.is_available || false}
                        onChange={(e) => handleFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>
                </>
              )}

              {editingItem.type === 'supplement' && (
                <>
                  <div className="form-group">
                    <label>Nome Supplemento:</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="es: Panna"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={editForm.code || ''}
                      onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: PANNA"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prezzo (€):</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editForm.price || ''}
                      onChange={(e) => handleFormChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="es: 0.50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine visualizzazione:</label>
                    <input
                      type="number"
                      value={editForm.display_order || 0}
                      onChange={(e) => handleFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editForm.is_available || false}
                        onChange={(e) => handleFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancelEdit}>Annulla</button>
              <button className="btn-save" onClick={handleSaveEdit}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Creazione */}
      {creatingItem && (
        <div className="modal-overlay" onClick={handleCancelCreate}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {creatingItem.type === 'flavor' && '➕ Nuovo Gusto'}
                {creatingItem.type === 'category' && '➕ Nuova Categoria'}
                {creatingItem.type === 'product' && '➕ Nuovo Prodotto'}
                {creatingItem.type === 'supplement' && '➕ Nuovo Supplemento'}
              </h3>
              <button className="modal-close" onClick={handleCancelCreate}>✕</button>
            </div>

            <div className="modal-body">
              {creatingItem.type === 'category' && (
                <>
                  <div className="form-group">
                    <label>Nome Categoria:</label>
                    <input
                      type="text"
                      value={createForm.name || ''}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      placeholder="es: Coni"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={createForm.code || ''}
                      onChange={(e) => handleCreateFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: CAT_CONI"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine visualizzazione:</label>
                    <input
                      type="number"
                      value={createForm.display_order || 0}
                      onChange={(e) => handleCreateFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.is_active !== false}
                        onChange={(e) => handleCreateFormChange('is_active', e.target.checked)}
                      />
                      Attiva
                    </label>
                  </div>
                </>
              )}

              {creatingItem.type === 'product' && (
                <>
                  <div className="form-group">
                    <label>Nome Prodotto:</label>
                    <input
                      type="text"
                      value={createForm.name || ''}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      placeholder="es: Cono piccolo"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={createForm.code || ''}
                      onChange={(e) => handleCreateFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: CONO_PICCOLO"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria:</label>
                    <select
                      value={createForm.category_code || ''}
                      onChange={(e) => handleCreateFormChange('category_code', e.target.value)}
                    >
                      <option value="">Seleziona categoria</option>
                      {data.categories.map(cat => (
                        <option key={cat.id} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Prezzo (€):</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={createForm.price || ''}
                      onChange={(e) => handleCreateFormChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="es: 3.50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine visualizzazione:</label>
                    <input
                      type="number"
                      value={createForm.display_order || 0}
                      onChange={(e) => handleCreateFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.has_flavors !== false}
                        onChange={(e) => handleCreateFormChange('has_flavors', e.target.checked)}
                      />
                      Ha gusti
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.is_available !== false}
                        onChange={(e) => handleCreateFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>
                </>
              )}

              {creatingItem.type === 'flavor' && (
                <>
                  <div className="form-group">
                    <label>Nome Gusto:</label>
                    <input
                      type="text"
                      value={createForm.name || ''}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      placeholder="es: Cioccolato"
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoria (opzionale):</label>
                    <select
                      value={createForm.category_code || ''}
                      onChange={(e) => handleCreateFormChange('category_code', e.target.value)}
                    >
                      <option value="">Tutte le categorie</option>
                      {data.categories.map(cat => (
                        <option key={cat.id} value={cat.code}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ordine visualizzazione:</label>
                    <input
                      type="number"
                      value={createForm.display_order || 0}
                      onChange={(e) => handleCreateFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.is_available !== false}
                        onChange={(e) => handleCreateFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>
                </>
              )}

              {creatingItem.type === 'supplement' && (
                <>
                  <div className="form-group">
                    <label>Nome Supplemento:</label>
                    <input
                      type="text"
                      value={createForm.name || ''}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      placeholder="es: Panna"
                    />
                  </div>
                  <div className="form-group">
                    <label>Codice:</label>
                    <input
                      type="text"
                      value={createForm.code || ''}
                      onChange={(e) => handleCreateFormChange('code', e.target.value.toUpperCase())}
                      placeholder="es: PANNA"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prezzo (€):</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={createForm.price || ''}
                      onChange={(e) => handleCreateFormChange('price', parseFloat(e.target.value) || 0)}
                      placeholder="es: 0.50"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ordine visualizzazione:</label>
                    <input
                      type="number"
                      value={createForm.display_order || 0}
                      onChange={(e) => handleCreateFormChange('display_order', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={createForm.is_available !== false}
                        onChange={(e) => handleCreateFormChange('is_available', e.target.checked)}
                      />
                      Disponibile
                    </label>
                  </div>

                  {/* Selezione prodotti per nuovo supplemento */}
                  <div className="form-group">
                    <label className="form-label-header">
                      Prodotti associati ({createSupplementProductIds.length} selezionati)
                    </label>
                    <div className="create-products-selection">
                      {data.categories.map(category => {
                        const categoryProducts = data.products.filter(p => p.category_code === category.code)
                        if (categoryProducts.length === 0) return null

                        const allSelected = categoryProducts.every(p => createSupplementProductIds.includes(p.id))
                        const someSelected = categoryProducts.some(p => createSupplementProductIds.includes(p.id))

                        return (
                          <div key={category.id} className="create-category-group">
                            <label className="category-select-all">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={input => {
                                  if (input) input.indeterminate = someSelected && !allSelected
                                }}
                                onChange={() => {
                                  if (allSelected) {
                                    // Deseleziona tutti
                                    setCreateSupplementProductIds(prev =>
                                      prev.filter(id => !categoryProducts.map(p => p.id).includes(id))
                                    )
                                  } else {
                                    // Seleziona tutti
                                    setCreateSupplementProductIds(prev => [
                                      ...prev.filter(id => !categoryProducts.map(p => p.id).includes(id)),
                                      ...categoryProducts.map(p => p.id)
                                    ])
                                  }
                                }}
                              />
                              <span className="category-select-name">{category.name}</span>
                            </label>
                            <div className="create-products-list">
                              {categoryProducts.map(product => (
                                <label key={product.id} className="create-product-item">
                                  <input
                                    type="checkbox"
                                    checked={createSupplementProductIds.includes(product.id)}
                                    onChange={() => handleToggleCreateSupplementProduct(product.id)}
                                  />
                                  <span>{product.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancelCreate}>Annulla</button>
              <button className="btn-save" onClick={handleSaveCreate}>Crea</button>
            </div>
          </div>
        </div>
      )}

      {/* Vista Dettaglio Categoria */}
      {token && viewMode === 'category-detail' && selectedCategory && (
        <div className="menu-content">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToList}>← Indietro</button>
            <div className="detail-title">
              <h2>📁 {selectedCategory.name || 'Categoria senza nome'}</h2>
              <span className="detail-subtitle">Codice: {selectedCategory.code} • {categoryProducts.length} prodotti</span>
            </div>
            <div className="detail-actions">
              <button className="btn-action btn-action-edit" title="Modifica" onClick={() => handleEditItem('category', selectedCategory)}>✏️</button>
            </div>
          </div>

          <div className="menu-section">
            <div className="section-header">
              <h3>🍦 Prodotti</h3>
              <button className="btn-add-inline" onClick={() => handleOpenCreate('product')}>+ Nuovo Prodotto</button>
            </div>
            <div className="menu-list">
              {categoryProducts.length === 0 ? (
                <p className="empty-state">Nessun prodotto in questa categoria</p>
              ) : (
                categoryProducts.map(product => (
                  <div
                    key={product.id}
                    className="menu-item clickable"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="menu-item-info">
                      <h3>{product.name || 'Prodotto senza nome'}</h3>
                      <p>€{product.price != null ? parseFloat(product.price).toFixed(2) : 'N/D'} • {product.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                    </div>
                    <div className="menu-item-actions">
                      <button className="btn-action btn-action-edit" title="Modifica" onClick={(e) => { e.stopPropagation(); handleEditItem('product', product); }}>✏️</button>
                      <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}>🔍</button>
                      <button className="btn-action btn-action-delete" title="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}>🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista Dettaglio Prodotto */}
      {token && viewMode === 'product-detail' && selectedProduct && (
        <div className="menu-content">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToCategory}>← Indietro</button>
            <div className="detail-title">
              <h2>🍦 {selectedProduct.name}</h2>
              <span className="detail-subtitle">
                €{selectedProduct.price != null ? parseFloat(selectedProduct.price).toFixed(2) : 'N/D'} •
                {selectedProduct.is_available ? ' ✓ Disponibile' : ' ✗ Non disponibile'} •
                {selectedProduct.has_flavors ? ' Con gusti' : ' Senza gusti'}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn-action btn-action-edit" title="Modifica" onClick={() => handleEditItem('product', selectedProduct)}>✏️</button>
            </div>
          </div>

          <div className="menu-section">
            <div className="section-header">
              <h3>➕ Supplementi disponibili ({availableSupplements.length})</h3>
            </div>
            <div className="menu-list">
              {availableSupplements.length === 0 ? (
                <p className="empty-state">Nessun supplemento disponibile per questo prodotto</p>
              ) : (
                availableSupplements.map(supplement => (
                  <div key={supplement.id} className="menu-item">
                    <div className="menu-item-info">
                      <h3>{supplement.name}</h3>
                      <p>€{supplement.price != null ? parseFloat(supplement.price).toFixed(2) : 'N/D'} • {supplement.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                    </div>
                    <div className="menu-item-actions">
                      <button className="btn-action btn-action-edit" title="Modifica" onClick={() => handleEditItem('supplement', supplement)}>✏️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista Dettaglio Supplemento */}
      {token && viewMode === 'supplement-detail' && selectedSupplement && (
        <div className="menu-content">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToSupplements}>← Indietro</button>
            <div className="detail-title">
              <h2>➕ {selectedSupplement.name}</h2>
              <span className="detail-subtitle">
                €{selectedSupplement.price != null ? parseFloat(selectedSupplement.price).toFixed(2) : 'N/D'} •
                {selectedSupplement.is_available ? ' ✓ Disponibile' : ' ✗ Non disponibile'} •
                Codice: {selectedSupplement.code || 'N/D'}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn-action btn-action-edit" title="Modifica" onClick={() => handleEditItem('supplement', selectedSupplement)}>✏️</button>
            </div>
          </div>

          <div className="menu-section">
            <div className="section-header">
              <h3>🍦 Prodotti associati ({productsForSupplement.length})</h3>
              <button className="btn-add-inline" onClick={handleOpenProductsModal}>
                Gestisci Prodotti
              </button>
            </div>
            <div className="menu-list">
              {productsForSupplement.length === 0 ? (
                <p className="empty-state">Nessun prodotto associato a questo supplemento</p>
              ) : (
                productsForSupplement.map(product => {
                  const category = data.categories.find(c => c.code === product.category_code)
                  return (
                    <div
                      key={product.id}
                      className="menu-item clickable"
                      onClick={() => {
                        setSelectedCategory(category)
                        handleProductClick(product)
                      }}
                    >
                      <div className="menu-item-info">
                        <h3>{product.name}</h3>
                        <p>€{parseFloat(product.price).toFixed(2)} • {category?.name || product.category_code} • {product.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                      </div>
                      <div className="menu-item-actions">
                        <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCategory(category)
                          handleProductClick(product)
                        }}>🔍</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vista Dettaglio Gusto */}
      {token && viewMode === 'flavor-detail' && selectedFlavor && (
        <div className="menu-content">
          <div className="detail-header">
            <button className="btn-back" onClick={handleBackToFlavors}>← Indietro</button>
            <div className="detail-title">
              <h2>🎨 {selectedFlavor.name}</h2>
              <span className="detail-subtitle">
                {selectedFlavor.is_available ? '✓ Disponibile' : '✗ Non disponibile'}
              </span>
            </div>
            <div className="detail-actions">
              <button className="btn-action btn-action-edit" title="Modifica" onClick={() => handleEditItem('flavor', selectedFlavor)}>✏️</button>
            </div>
          </div>

          {/* Categorie associate */}
          <div className="menu-section">
            <div className="section-header">
              <h3>📁 Categorie associate ({selectedFlavor.category_codes?.length || 0})</h3>
            </div>
            <div className="menu-list">
              {(!selectedFlavor.category_codes || selectedFlavor.category_codes.length === 0) ? (
                <p className="empty-state">Nessuna categoria associata</p>
              ) : (
                selectedFlavor.category_codes.map(code => {
                  const category = data.categories.find(c => c.code === code)
                  const productsInCategory = data.products.filter(p => p.has_flavors === true && p.category_code === code).length
                  return (
                    <div
                      key={code}
                      className="menu-item clickable"
                      onClick={() => {
                        if (category) {
                          handleCategoryClick(category)
                        }
                      }}
                    >
                      <div className="menu-item-info">
                        <h3>{category?.name || code}</h3>
                        <p>{productsInCategory} prodotti con gusti</p>
                      </div>
                      <div className="menu-item-actions">
                        <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => {
                          e.stopPropagation()
                          if (category) handleCategoryClick(category)
                        }}>🔍</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Prodotti associati */}
          <div className="menu-section">
            <div className="section-header">
              <h3>🍦 Prodotti associati ({productsForFlavor.length})</h3>
            </div>
            <div className="menu-list">
              {productsForFlavor.length === 0 ? (
                <p className="empty-state">Nessun prodotto associato a questo gusto</p>
              ) : (
                productsForFlavor.map(product => {
                  const category = data.categories.find(c => c.code === product.category_code)
                  return (
                    <div
                      key={product.id}
                      className="menu-item clickable"
                      onClick={() => {
                        setSelectedCategory(category)
                        handleProductClick(product)
                      }}
                    >
                      <div className="menu-item-info">
                        <h3>{product.name}</h3>
                        <p>€{parseFloat(product.price).toFixed(2)} • {category?.name || product.category_code} • {product.is_available ? '✓ Disponibile' : '✗ Non disponibile'}</p>
                      </div>
                      <div className="menu-item-actions">
                        <button className="btn-action btn-action-view" title="Visualizza" onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCategory(category)
                          handleProductClick(product)
                        }}>🔍</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestione Prodotti Associati */}
      {showProductsModal && selectedSupplement && (
        <div className="modal-overlay" onClick={handleCloseProductsModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🍦 Gestisci Prodotti per "{selectedSupplement.name}"</h3>
              <button className="modal-close" onClick={handleCloseProductsModal}>✕</button>
            </div>

            <div className="modal-body">
              <p className="modal-description">
                Seleziona i prodotti che possono avere questo supplemento.
              </p>

              <div className="products-selection-grid">
                {data.categories.map(category => {
                  const categoryProducts = data.products.filter(p => p.category_code === category.code)
                  if (categoryProducts.length === 0) return null

                  return (
                    <div key={category.id} className="category-products-group">
                      <h4 className="category-group-title">{category.name}</h4>
                      <div className="products-checkbox-list">
                        {categoryProducts.map(product => (
                          <label key={product.id} className="product-checkbox-item">
                            <input
                              type="checkbox"
                              checked={associatedProductIds.includes(product.id)}
                              onChange={() => handleToggleProduct(product.id)}
                            />
                            <span className="product-checkbox-name">{product.name}</span>
                            <span className="product-checkbox-price">€{parseFloat(product.price).toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer">
              <span className="selected-count">{associatedProductIds.length} prodotti selezionati</span>
              <div className="modal-footer-buttons">
                <button className="btn-cancel" onClick={handleCloseProductsModal}>Annulla</button>
                <button
                  className="btn-save"
                  onClick={handleSaveProductAssociations}
                  disabled={savingAssociations}
                >
                  {savingAssociations ? 'Salvataggio...' : 'Salva Associazioni'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonitorMenuManagement
