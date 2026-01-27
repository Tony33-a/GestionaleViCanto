import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import tablesService from '../../services/tablesService'
import ordersService from '../../services/ordersService'
import menuService from '../../services/menuService'
import Counter from '../../components/common/Counter'
import Modal from '../../components/common/Modal'
import ProductModal from '../../components/tablet/ProductModal'
import { useAuthStore } from '../../stores/authStore'
import './MonitorOrder.css'

function MonitorOrder() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const passedState = location.state || {}

  // Funzione per rilasciare il lock
  const unlockTable = useCallback(() => {
    if (tableId && user?.id) {
      tablesService.unlock(tableId, user.id).catch(err => {
        console.log('Unlock tavolo:', err.message)
      })
    }
  }, [tableId, user?.id])

  // State
  const [covers, setCovers] = useState(passedState.covers || 1)
  const [orderItems, setOrderItems] = useState(passedState.orderItems || [])
  const [existingOrderId, setExistingOrderId] = useState(null)
  const [existingOrderStatus, setExistingOrderStatus] = useState(null)
  const [newItems, setNewItems] = useState([])
  const [showSummary, setShowSummary] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [editingPriceIndex, setEditingPriceIndex] = useState(null)
  const [tempPrice, setTempPrice] = useState('')

  // Query tavolo
  const { data: table, isLoading: tableLoading } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => tablesService.getById(tableId),
  })

  // Query menu
  const { data: menuData, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      try {
        const [categories, flavors] = await Promise.all([
          menuService.getCategories(),
          menuService.getFlavors()
        ])
        console.log('Menu loaded:', { categories, flavors })
        return { categories: categories || [], flavors: flavors || [] }
      } catch (err) {
        console.error('Errore caricamento menu:', err)
        throw err
      }
    }
  })

  if (menuError) {
    console.error('Menu query error:', menuError)
  }

  const categories = menuData?.categories || []
  const flavors = menuData?.flavors || []

  
  // Carica ordine esistente
  useEffect(() => {
    if (table?.current_order) {
      setExistingOrderId(table.current_order.id)
      setExistingOrderStatus(table.current_order.status)
      setCovers(table.current_order.covers || 1)

      const existingItems = table.current_order.items?.map(item => ({
        id: item.id,
        categoryCode: item.category_code || item.category,
        categoryName: categories.find(c => c.code === (item.category_code || item.category))?.name || item.category,
        flavors: item.flavors || [],
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price) || 0,
        supplementsTotal: parseFloat(item.supplements_total) || 0,
        note: item.custom_note,
        course: item.course,
        supplements: item.supplements || [],
        isExisting: true
      })) || []

      setOrderItems(existingItems)
    }
  }, [table, categories])

  // Sync da passedState
  useEffect(() => {
    if (passedState.fromCategory && passedState.orderItems) {
      setOrderItems(passedState.orderItems)
      const newItemsFromCategory = passedState.orderItems.filter(item => !item.isExisting)
      setNewItems(newItemsFromCategory)
      if (passedState.showSummary) {
        setShowSummary(true)
      }
    }
  }, [location.key])

  // Calcolo totali
  const totals = useMemo(() => {
    const itemsTotal = orderItems.reduce((sum, item) => {
      return sum + (item.unitPrice + item.supplementsTotal) * item.quantity
    }, 0)
    const coversTotal = covers * 2 // Prezzo coperto fisso
    return {
      items: itemsTotal,
      covers: coversTotal,
      total: itemsTotal + coversTotal
    }
  }, [orderItems, covers])

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const order = await ordersService.create(orderData)
      return ordersService.send(order.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      unlockTable()
      navigate('/monitor/tables')
    }
  })

  const sendOrderMutation = useMutation({
    mutationFn: (orderId) => ordersService.send(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      unlockTable()
      navigate('/monitor/tables')
    }
  })

  const freeTableMutation = useMutation({
    mutationFn: () => tablesService.free(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      unlockTable()
      navigate('/monitor/tables')
    }
  })

  const cancelOrderMutation = useMutation({
    mutationFn: () => ordersService.cancel(existingOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      unlockTable()
      navigate('/monitor/tables')
    }
  })

  // Handler aggiungi prodotto
  const handleAddProduct = (product) => {
    const newItem = {
      id: `new-${Date.now()}`,
      categoryCode: selectedCategory.code,
      categoryName: selectedCategory.name,
      productName: product.name,
      flavors: [],
      quantity: 1,
      unitPrice: parseFloat(product.price) || parseFloat(selectedCategory.base_price) || 0,
      supplementsTotal: 0,
      note: '',
      course: 1,
      supplements: [],
      isExisting: false
    }
    setOrderItems([...orderItems, newItem])
    setNewItems([...newItems, newItem])
  }

  // Handler modifica quantità
  const handleQuantityChange = (index, newQuantity) => {
    if (newQuantity < 1) {
      // Rimuovi item
      const updatedItems = orderItems.filter((_, i) => i !== index)
      setOrderItems(updatedItems)
      setNewItems(updatedItems.filter(item => !item.isExisting))
    } else {
      const updatedItems = [...orderItems]
      updatedItems[index] = { ...updatedItems[index], quantity: newQuantity }
      setOrderItems(updatedItems)
    }
  }

  // Handler modifica prezzo
  const handlePriceEdit = (index) => {
    setEditingPriceIndex(index)
    setTempPrice(orderItems[index].unitPrice.toFixed(2))
  }

  const handlePriceSave = (index) => {
    const newPrice = parseFloat(tempPrice) || 0
    const updatedItems = [...orderItems]
    updatedItems[index] = { ...updatedItems[index], unitPrice: newPrice }
    setOrderItems(updatedItems)
    setEditingPriceIndex(null)
    setTempPrice('')
  }

  const handlePriceCancel = () => {
    setEditingPriceIndex(null)
    setTempPrice('')
  }

  // Handler invia ordine
  const handleSendOrder = () => {
    const orderData = {
      table_id: parseInt(tableId),
      covers: covers,
      items: orderItems.map(item => ({
        category: item.categoryCode,
        product_name: item.productName || item.categoryName,
        flavors: item.flavors,
        quantity: item.quantity,
        course: item.course,
        custom_note: item.note,
        supplements: item.supplements,
        unit_price: item.unitPrice,
        supplements_total: item.supplementsTotal,
        total_price: (item.unitPrice + item.supplementsTotal) * item.quantity,
      }))
    }

    if (existingOrderId) {
      ordersService.update(existingOrderId, orderData).then(() => {
        sendOrderMutation.mutate(existingOrderId)
      })
    } else {
      createOrderMutation.mutate(orderData)
    }
  }

  // Handler torna indietro
  const handleGoBack = () => {
    unlockTable()
    navigate('/monitor/tables')
  }

  const isLoading = tableLoading || menuLoading

  if (isLoading) {
    return (
      <div className="monitor-order">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  // Prodotti della categoria selezionata
  const categoryProducts = selectedCategory 
    ? flavors.filter(f => f.category_code === selectedCategory.code && f.is_active)
    : []

  // Debug
  useEffect(() => {
    if (selectedCategory) {
      console.log('Selected category changed:', selectedCategory.code, selectedCategory.name)
    }
  }, [selectedCategory])

  
  return (
    <div className="monitor-order">
      {/* Header */}
      <div className="monitor-order-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleGoBack}>
            ← Indietro
          </button>
          <h1>Tavolo {table?.number}</h1>
          <span className={`status-badge status-${table?.status}`}>
            {table?.status === 'free' ? 'Libero' : 
             table?.status === 'pending' ? 'In attesa' : 'Occupato'}
          </span>
        </div>
        <div className="header-right">
          <div className="covers-selector">
            <span>Coperti:</span>
            <Counter value={covers} onChange={setCovers} min={1} max={20} />
          </div>
          {(table?.status === 'occupied' || table?.status === 'pending') && (
            <button 
              className="btn-danger"
              onClick={() => {
                if (window.confirm('Vuoi chiudere il tavolo e stampare il preconto?')) {
                  freeTableMutation.mutate();
                }
              }}
              disabled={freeTableMutation.isPending}
            >
              Libera Tavolo
            </button>
          )}
        </div>
      </div>

      <div className="monitor-order-content">
        {/* Pannello sinistro - Categorie e Prodotti */}
        <div className="left-panel">
          <div className="categories-section">
            <h3>Categorie</h3>
            <div className="categories-grid">
              {categories.length === 0 && (
                <p style={{color: '#999', padding: '20px'}}>Nessuna categoria trovata</p>
              )}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedCategory?.id === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {selectedCategory && (
            <div className="products-section">
              <h3>{selectedCategory.name}</h3>
              <div className="products-grid">
                {categoryProducts.map((product) => (
                  <button
                    key={product.id}
                    className="product-btn"
                    onClick={() => handleAddProduct(product)}
                  >
                    <span className="product-name">{product.name}</span>
                    <span className="product-price">
                      €{parseFloat(product.price || selectedCategory.base_price || 0).toFixed(2)}
                    </span>
                  </button>
                ))}
                {categoryProducts.length === 0 && (
                  <button
                    className="product-btn"
                    onClick={() => handleAddProduct({ name: selectedCategory.name, price: selectedCategory.base_price })}
                  >
                    <span className="product-name">{selectedCategory.name}</span>
                    <span className="product-price">
                      €{parseFloat(selectedCategory.base_price || 0).toFixed(2)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pannello destro - Riepilogo Ordine */}
        <div className="right-panel">
          <div className="order-summary-panel">
            <h3>Riepilogo Ordine</h3>
            
            <div className="order-items-list">
              {orderItems.length === 0 ? (
                <p className="empty-message">Nessun prodotto aggiunto</p>
              ) : (
                orderItems.map((item, index) => (
                  <div key={item.id || index} className={`order-item ${item.isExisting ? 'existing' : 'new'}`}>
                    <div className="item-info">
                      <span className="item-name">
                        {item.productName || item.categoryName}
                        {item.isExisting && <span className="existing-badge">✓</span>}
                      </span>
                      {item.flavors?.length > 0 && (
                        <span className="item-flavors">{item.flavors.join(', ')}</span>
                      )}
                    </div>
                    <div className="item-controls">
                      <Counter 
                        value={item.quantity} 
                        onChange={(val) => handleQuantityChange(index, val)}
                        min={0}
                        max={99}
                      />
                      {editingPriceIndex === index ? (
                        <div className="price-edit">
                          <input
                            type="number"
                            step="0.01"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="price-input"
                            autoFocus
                          />
                          <button className="price-save" onClick={() => handlePriceSave(index)}>✓</button>
                          <button className="price-cancel" onClick={handlePriceCancel}>✕</button>
                        </div>
                      ) : (
                        <button 
                          className="item-price editable"
                          onClick={() => handlePriceEdit(index)}
                          title="Clicca per modificare il prezzo"
                        >
                          €{((item.unitPrice + item.supplementsTotal) * item.quantity).toFixed(2)}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Coperti ({covers}x €2.00)</span>
                <span>€{totals.covers.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Prodotti</span>
                <span>€{totals.items.toFixed(2)}</span>
              </div>
              <div className="total-row total-final">
                <span>Totale</span>
                <span>€{totals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="order-actions">
              {newItems.length > 0 || orderItems.some(i => !i.isExisting) ? (
                <button 
                  className="btn-primary"
                  onClick={handleSendOrder}
                  disabled={createOrderMutation.isPending || sendOrderMutation.isPending}
                >
                  {createOrderMutation.isPending || sendOrderMutation.isPending 
                    ? 'Invio...' 
                    : 'Invia Comanda'}
                </button>
              ) : existingOrderStatus === 'pending' ? (
                <button
                  className="btn-danger"
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                >
                  Annulla Comanda
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonitorOrder
