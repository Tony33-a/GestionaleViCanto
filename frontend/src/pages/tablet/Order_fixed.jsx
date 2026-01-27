import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import tablesService from '../../services/tablesService'
import ordersService from '../../services/ordersService'
import menuService from '../../services/menuService'
import Counter from '../../components/common/Counter'
import Modal from '../../components/common/Modal'
import ProductModal from '../../components/tablet/ProductModal'
import './Order.css'

function TabletOrder() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Dati passati dalla pagina prodotti (se si torna indietro)
  const passedState = location.state || {}

  const isAsporto = tableId === 'asporto'

  // State locale ordine
  const [covers, setCovers] = useState(passedState.covers || 1)
  const [orderItems, setOrderItems] = useState(passedState.orderItems || [])
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [existingOrderId, setExistingOrderId] = useState(null)
  const [existingOrderStatus, setExistingOrderStatus] = useState(null)
  const [existingOrderItems, setExistingOrderItems] = useState([]) // Items originali dal backend
  const [newItems, setNewItems] = useState([]) // Nuovi items aggiunti dall'utente

  // State per ricerca globale prodotti
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productModalOpen, setProductModalOpen] = useState(false)

  // Fetch tavolo
  const { data: table, isLoading: tableLoading } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => tablesService.getById(tableId),
    enabled: !isAsporto && !!tableId,
  })

  // Fetch menu completo
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: menuService.getFullMenu,
  })

  // Carica ordine esistente e separa items vecchi da nuovi
  useEffect(() => {
    if (table) {
      if (table.current_order) {
        const order = table.current_order
        setExistingOrderId(order.id)
        setExistingOrderStatus(order.status)
        setCovers(order.covers || 1)

        // Mappa gli items dal backend (items esistenti)
        const backendItems = (order.items && order.items.length > 0)
          ? order.items.map(item => ({
              id: item.id,
              productCode: item.product_code,
              productName: item.product_name,
              categoryCode: item.category_code,
              flavors: item.flavors || [],
              quantity: item.quantity,
              course: item.course,
              note: item.custom_note || '',
              supplements: item.supplements || [],
              unitPrice: parseFloat(item.unit_price),
              supplementsTotal: parseFloat(item.supplements_total || 0),
              isExisting: true, // Flag per identificare items esistenti
            }))
          : []

        setExistingOrderItems(backendItems)

        // Se abbiamo items passati via location.state, sono nuovi items
        if (passedState.orderItems && passedState.orderItems.length > 0) {
          const onlyNewItems = passedState.orderItems.map(item => ({
            ...item,
            isExisting: false, // Flag per nuovi items
            id: Date.now() + Math.random() // ID temporaneo per nuovi items
          }))
          setNewItems(onlyNewItems)
          setOrderItems([...backendItems, ...onlyNewItems])
        } else {
          setNewItems([])
          setOrderItems(backendItems)
        }
      } else {
        // Tavolo libero - resetta tutto
        setExistingOrderId(null)
        setExistingOrderStatus(null)
        setExistingOrderItems([])
        setNewItems([])
        setOrderItems(passedState.orderItems || [])
        setCovers(passedState.covers || 1)
      }
    }
  }, [table, passedState])

  // Calcola totali
  const totals = useMemo(() => {
    const itemsSubtotal = orderItems.reduce((sum, item) => {
      const itemTotal = (item.unitPrice + item.supplementsTotal) * item.quantity
      return sum + itemTotal
    }, 0)
    const coverCharge = covers * 0.20
    return {
      itemsSubtotal,
      coverCharge: isAsporto ? 0 : coverCharge,
      total: itemsSubtotal + (isAsporto ? 0 : coverCharge)
    }
  }, [orderItems, covers, isAsporto])

  // Mutation per creare/aggiornare ordine
  const orderMutation = useMutation({
    mutationFn: async (orderData) => {
      if (existingOrderId && existingOrderStatus === 'pending') {
        // Aggiorna ordine pending esistente
        return ordersService.update(existingOrderId, orderData)
      } else if (existingOrderId && existingOrderStatus === 'sent') {
        // Crea nuovo ordine aggiuntivo per tavolo occupied
        const newOrder = await ordersService.create({
          ...orderData,
          table_id: isAsporto ? null : parseInt(tableId),
          covers: 0, // Nuovi ordini non hanno coperto
          notes: `Aggiuntivo per ordine #${existingOrderId}`
        })
        // Invia subito il nuovo ordine
        await ordersService.send(newOrder.id)
        return newOrder
      } else {
        // Nuovo ordine per tavolo libero
        const order = await ordersService.create(orderData)
        return order
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setConfirmModalOpen(false)
      
      // Se era un ordine pending, ora invialo
      if (existingOrderStatus === 'pending' && !isAsporto) {
        ordersService.send(result.id).then(() => {
          queryClient.invalidateQueries({ queryKey: ['tables'] })
        })
      }
      
      navigate('/tablet/home')
    },
    onError: (error) => {
      alert('Errore ordine: ' + (error.response?.data?.error || error.message))
    }
  })

  // Mutation invia ordine pending
  const sendOrderMutation = useMutation({
    mutationFn: (orderId) => ordersService.send(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      navigate('/tablet/home')
    },
    onError: (error) => {
      alert('Errore invio: ' + (error.response?.data?.error || error.message))
    }
  })

  // Mutation annulla ordine
  const cancelOrderMutation = useMutation({
    mutationFn: () => ordersService.cancel(existingOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      navigate('/tablet/home')
    },
    onError: (error) => {
      alert('Errore annullamento: ' + (error.response?.data?.error || error.message))
    }
  })

  // Handler conferma ordine
  const handleConfirmOrder = () => {
    if (orderItems.length === 0) {
      alert('Aggiungi almeno un prodotto')
      return
    }
    setConfirmModalOpen(true)
  }

  // Handler invio ordine
  const handleSendOrder = async () => {
    const orderData = {
      table_id: isAsporto ? null : parseInt(tableId),
      covers: isAsporto ? 0 : covers,
      items: orderItems.map(item => ({
        product_code: item.productCode,
        product_name: item.productName,
        category: item.categoryCode,
        flavors: item.flavors,
        quantity: item.quantity,
        course: item.course,
        custom_note: item.note,
        unit_price: item.unitPrice,
      }))
    }

    if (existingOrderStatus === 'pending') {
      // Aggiorna ordine pending esistente
      orderMutation.mutate(orderData)
    } else if (existingOrderStatus === 'sent' && newItems.length > 0) {
      // Crea nuovo ordine solo con i nuovi items
      const newOrderData = {
        ...orderData,
        items: newItems.map(item => ({
          product_code: item.productCode,
          product_name: item.productName,
          category: item.categoryCode,
          flavors: item.flavors,
          quantity: item.quantity,
          course: item.course,
          custom_note: item.note,
          unit_price: item.unitPrice,
        }))
      }
      orderMutation.mutate(newOrderData)
    } else {
      // Nuovo ordine
      orderMutation.mutate(orderData)
    }
  }

  // Handler aggiungi prodotto
  const handleAddProduct = (productData) => {
    const isGeneric = selectedProduct.is_generic || selectedProduct.code?.startsWith('GENERICO_')
    const newItem = {
      id: Date.now() + Math.random(),
      productCode: selectedProduct.code,
      productName: isGeneric ? productData.customName : selectedProduct.name,
      categoryCode: selectedProduct.categoryCode,
      flavors: productData.flavors ? productData.flavors.map(f => f.name) : [],
      quantity: productData.quantity,
      course: productData.course,
      note: productData.note,
      isGift: productData.isGift || false,
      supplements: productData.supplements,
      unitPrice: isGeneric ? productData.customPrice : (productData.isGift ? 0 : parseFloat(selectedProduct.price || 0)),
      supplementsTotal: productData.isGift ? 0 : productData.supplements.reduce((sum, s) => sum + parseFloat(s.price), 0),
      isExisting: false, // Nuovo item
    }

    // Aggiungi ai nuovi items e agli orderItems totali
    setNewItems(prev => [...prev, newItem])
    setOrderItems(prev => [...prev, newItem])
  }

  // Handler rimuovi item
  const handleRemoveItem = (itemId) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId))
    setNewItems(prev => prev.filter(item => item.id !== itemId))
  }

  // Handler click categoria
  const handleCategoryClick = (category) => {
    navigate(`/tablet/category/${category.code}`, {
      state: { 
        tableId, 
        orderItems, 
        covers,
        existingOrderId,
        existingOrderStatus
      }
    })
  }

  // Handler torna indietro
  const handleGoBack = () => {
    if (newItems.length > 0) {
      // Salva i nuovi items nel location state
      navigate('/tablet/home', {
        state: { 
          tableId, 
          orderItems, 
          covers,
          existingOrderId,
          existingOrderStatus
        }
      })
    } else {
      navigate('/tablet/home')
    }
  }

  // Ricerca globale prodotti
  const searchResults = useMemo(() => {
    if (!productSearch.trim() || !menu?.categories) return []
    const search = productSearch.toLowerCase()
    const results = []
    menu.categories.forEach(cat => {
      (cat.products || []).forEach(prod => {
        if (prod.name.toLowerCase().includes(search)) {
          results.push({ ...prod, categoryCode: cat.code, categoryName: cat.name, flavors: cat.flavors || [] })
        }
      })
    })
    return results.slice(0, 10)
  }, [productSearch, menu])

  // Handler click su prodotto dalla ricerca
  const handleSearchProductClick = (product) => {
    setSelectedProduct(product)
    setProductModalOpen(true)
    setProductSearch('')
  }

  // Categorie dal menu
  const categories = menu?.categories || []

  if (tableLoading || menuLoading) {
    return <div className="loading">Caricamento...</div>
  }

  return (
    <div className="tablet-order">
      <div className="order-header">
        <div className="table-info">
          <h2>
            {isAsporto ? 'Ordine Asporto' : `Tavolo ${table?.number}`}
          </h2>
          <div className="table-status">
            Stato: <span className={`status-${table?.status || 'free'}`}>
              {table?.status === 'free' ? 'Libero' : 
               table?.status === 'pending' ? 'In Attesa' : 'Occupato'}
            </span>
            {existingOrderStatus && (
              <span className="order-status">
                Ordine: {existingOrderStatus === 'pending' ? 'In Attesa' : 'Inviato'}
              </span>
            )}
          </div>
        </div>
        
        <div className="covers-section">
          {!isAsporto && (
            <div className="covers-control">
              <label>Coperti:</label>
              <Counter
                value={covers}
                onChange={setCovers}
                min={1}
                max={20}
                disabled={existingOrderStatus === 'sent'} // Non modificare se ordine già inviato
              />
            </div>
          )}
        </div>
      </div>

      <div className="order-content">
        {/* Colonna sinistra: Categorie */}
        <div className="order-menu">
          {/* Barra ricerca globale prodotti */}
          <div className="global-search-section">
            <div className="global-search-container">
              <span className="global-search-icon">🔍</span>
              <input
                type="text"
                className="global-search-input"
                placeholder="Cerca prodotto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch && (
                <button
                  className="global-search-clear"
                  onClick={() => setProductSearch('')}
                >
                  ×
                </button>
              )}
            </div>
            {/* Risultati ricerca */}
            {searchResults.length > 0 && (
              <div className="global-search-results">
                {searchResults.map((product) => (
                  <button
                    key={`${product.categoryCode}-${product.id}`}
                    className="search-result-item"
                    onClick={() => handleSearchProductClick(product)}
                  >
                    <div className="search-result-info">
                      <span className="search-result-name">{product.name}</span>
                      <span className="search-result-category">{product.categoryName}</span>
                    </div>
                    <span className="search-result-price">
                      {product.price ? `€${parseFloat(product.price).toFixed(2)}` : 'Var.'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="categories-section">
            <h3>Categorie</h3>
            <div className="categories-grid">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="category-btn"
                  onClick={() => handleCategoryClick(cat)}
                >
                  <span className="category-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonna destra: Riepilogo Ordine */}
        <div className="order-summary">
          <h3>Riepilogo Ordine</h3>

          {orderItems.length === 0 ? (
            <p className="empty-order">Nessun prodotto aggiunto</p>
          ) : (
            <div className="order-items-list">
              {orderItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`order-item ${item.isExisting ? 'existing-item' : 'new-item'}`}
                >
                  <div className="order-item-info">
                    <div className="order-item-header">
                      <span className="order-item-qty">{item.quantity}x</span>
                      <span className="order-item-name">{item.productName}</span>
                      {!item.isExisting && (
                        <span className="new-item-badge">NUOVO</span>
                      )}
                      <button
                        className="remove-item-btn"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={item.isExisting} // Non rimuovere items esistenti
                      >
                        ×
                      </button>
                    </div>
                    <div className="order-item-details">
                      {item.flavors.length > 0 && (
                        <span className="order-item-flavors">{item.flavors.join(', ')}</span>
                      )}
                      {item.supplements.length > 0 && (
                        <span className="order-item-supplements">
                          + {item.supplements.map(s => s.name).join(', ')}
                        </span>
                      )}
                      {item.note && (
                        <span className="order-item-note">Note: {item.note}</span>
                      )}
                    </div>
                  </div>
                  <span className="order-item-price">
                    €{((item.unitPrice + item.supplementsTotal) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totali */}
          <div className="order-totals">
            {!isAsporto && (
              <div className="total-row">
                <span>Coperto ({covers}x €0.20)</span>
                <span>€{totals.coverCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row total-final">
              <span>TOTALE</span>
              <span>€{totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Pulsanti azione - logica semplificata */}
          <div className="order-actions">
            <button className="btn-secondary" onClick={handleGoBack}>
              ← Indietro
            </button>

            {existingOrderStatus === 'sent' ? (
              // Tavolo occupato - solo aggiunta nuovi items
              <>
                {newItems.length > 0 && (
                  <button
                    className="btn-primary"
                    onClick={handleConfirmOrder}
                    disabled={orderMutation.isPending}
                  >
                    {orderMutation.isPending ? 'Invio...' : 'Aggiungi alla Comanda'}
                  </button>
                )}
              </>
            ) : existingOrderStatus === 'pending' ? (
              // Tavolo in attesa - annulla o invia tutto
              <>
                <button
                  className="btn-danger"
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                >
                  {cancelOrderMutation.isPending ? 'Annullamento...' : 'Annulla Comanda'}
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmOrder}
                  disabled={orderItems.length === 0 || orderMutation.isPending}
                >
                  {orderMutation.isPending ? 'Invio...' : 'Invia Comanda'}
                </button>
              </>
            ) : (
              // Nuovo ordine
              <button
                className="btn-primary"
                onClick={handleConfirmOrder}
                disabled={orderItems.length === 0 || orderMutation.isPending}
              >
                {orderMutation.isPending ? 'Invio...' : 'Invia Comanda'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Conferma */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Conferma Comanda"
        size="medium"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => setConfirmModalOpen(false)}
              disabled={orderMutation.isPending}
            >
              Annulla
            </button>
            <button
              className="btn-primary"
              onClick={handleSendOrder}
              disabled={orderMutation.isPending}
            >
              {orderMutation.isPending ? 'Invio...' : 'Conferma e Invia'}
            </button>
          </>
        }
      >
        <div className="confirm-order-content">
          <p className="confirm-table">
            {isAsporto ? 'Ordine Asporto' : `Tavolo ${table?.number}`}
          </p>
          {!isAsporto && <p className="confirm-covers">Coperti: {covers}</p>}

          <div className="confirm-items">
            {orderItems.map((item, idx) => (
              <div key={idx} className={`confirm-item ${item.isExisting ? 'existing' : 'new'}`}>
                <span>
                  {item.quantity}x {item.productName}
                  {item.flavors.length > 0 && ` - ${item.flavors.join(', ')}`}
                  {!item.isExisting && ' (NUOVO)'}
                </span>
                <span>€{((item.unitPrice + item.supplementsTotal) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="confirm-total">
            <span>TOTALE</span>
            <span>€{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </Modal>

      {/* Modal Prodotto da ricerca */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        flavors={selectedProduct?.flavors || []}
        supplements={menu?.supplements || []}
        onAdd={handleAddProduct}
      />
    </div>
  )
}

export default TabletOrder
