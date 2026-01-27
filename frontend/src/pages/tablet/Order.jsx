import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import tablesService from '../../services/tablesService'
import ordersService from '../../services/ordersService'
import menuService from '../../services/menuService'
import OrderCalculator from '../../services/orderCalculator';
import Counter from '../../components/common/Counter'
import Modal from '../../components/common/Modal'
import ProductModal from '../../components/tablet/ProductModal'
import { useAuthStore } from '../../stores/authStore'
import './Order.css'
import './Order_fixed.css'

function TabletOrder() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Dati passati dalla pagina prodotti (se si torna indietro)
  const passedState = location.state || {}

  const isAsporto = tableId === 'asporto'
  const isMonitor = location.pathname.startsWith('/monitor')
  const homePath = isMonitor ? '/monitor/tables' : '/tablet/home'
  const categoryPath = isMonitor ? `/monitor/category` : `/tablet/category`

  // Funzione per rilasciare il lock
  const unlockTable = useCallback(() => {
    if (!isAsporto && tableId && user?.id) {
      tablesService.unlock(tableId, user.id).catch(err => {
        console.log('Unlock tavolo:', err.message)
      })
    }
  }, [tableId, isAsporto, user?.id])

  // State locale ordine
  const [covers, setCovers] = useState(passedState.covers || 1)
  const [orderItems, setOrderItems] = useState(passedState.orderItems || [])
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [existingOrderId, setExistingOrderId] = useState(null)
  const [existingOrderStatus, setExistingOrderStatus] = useState(null) // pending, sent, etc.
  const [existingOrderItems, setExistingOrderItems] = useState([]) // Items originali dal backend
  const [newItems, setNewItems] = useState([]) // Nuovi items aggiunti dall'utente

  // State per ricerca globale prodotti
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productModalOpen, setProductModalOpen] = useState(false)

  // State per vista mobile: false = categorie, true = riepilogo
  const [showSummary, setShowSummary] = useState(passedState.showSummary || false)

  // State per modifica prezzo (solo admin/monitor)
  const [editingPriceId, setEditingPriceId] = useState(null)
  const [editingPriceValue, setEditingPriceValue] = useState('')

  // State per menu hamburger
  const [menuOpen, setMenuOpen] = useState(false)

  // Sincronizza orderItems quando si naviga da CategoryProducts
  useEffect(() => {
    if (passedState.orderItems && passedState.orderItems.length > 0) {
      console.log('🔍 DEBUG - Sync orderItems:', passedState.orderItems);
      setOrderItems(passedState.orderItems);
      // Imposta anche newItems per abilitare il tasto Invia
      const newItemsFromCategory = passedState.orderItems.filter(item => !item.isExisting);
      setNewItems(newItemsFromCategory);
    }
    if (passedState.showSummary) {
      setShowSummary(true);
    }
  }, [location.key]) // Usa location.key per forzare sync ad ogni navigazione

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
    console.log('🔍 DEBUG - useEffect triggered');
    console.log('🔍 DEBUG - table:', table);
    console.log('🔍 DEBUG - passedState:', passedState);
    
    if (table) {
      console.log('🔍 DEBUG - tavolo trovato, status:', table.status);
      
      if (table.current_order) {
        console.log('🔍 DEBUG - ordine corrente trovato:', table.current_order);
        const order = table.current_order
        setExistingOrderId(order.id)
        setExistingOrderStatus(order.status)
        setCovers(order.covers || 1)

        // Mappa gli items dal backend (items esistenti)
        const backendItems = (order.items && order.items.length > 0)
          ? order.items.map(item => {
              console.log('🔍 DEBUG - mapping item:', item);
              return {
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
              }
            })
          : []

        console.log('🔍 DEBUG - backendItems mappati:', backendItems);
        setExistingOrderItems(backendItems)

        // LOGICA UNIFICATA PER TAVOLI CON ORDINE ESISTENTI
        // 1. Se ci sono items da location.state, sono nuovi items da aggiungere
        if (passedState.orderItems && passedState.orderItems.length > 0) {
          const backendItemIds = new Set(backendItems.map(item => item.id));
          const onlyNewItems = passedState.orderItems.filter(item => 
            !backendItemIds.has(item.id) // Filtra solo items non esistenti nel backend
          ).map(item => ({
            ...item,
            isExisting: false, // Flag per nuovi items
            id: Date.now() + Math.random() // ID temporaneo per nuovi items
          }))
          
          console.log('🔍 DEBUG - passedState.orderItems:', passedState.orderItems);
          console.log('🔍 DEBUG - backendItemIds:', Array.from(backendItemIds));
          console.log('🔍 DEBUG - nuovi items filtrati:', onlyNewItems);
          
          setNewItems(onlyNewItems)
          setOrderItems([...backendItems, ...onlyNewItems])
          console.log('🔍 DEBUG - items totali con nuovi:', [...backendItems, ...onlyNewItems]);
        } else {
          // 2. Se passedState è vuoto, controlla se ci sono già nuovi items nello stato locale
          // Questo accade quando si aggiungono prodotti localmente senza navigation
          const currentNewItems = orderItems.filter(item => !item.isExisting);
          console.log('🔍 DEBUG - currentNewItems da stato locale:', currentNewItems);
          
          if (currentNewItems.length > 0) {
            // Ci sono già nuovi items aggiunti localmente
            setNewItems(currentNewItems)
            // orderItems dovrebbe già contenere backendItems + currentNewItems
            console.log('🔍 DEBUG - mantenuti items esistenti + locali:', orderItems);
          } else {
            // Nessun nuovo item, usa solo backendItems
            setNewItems([])
            setOrderItems(backendItems)
            console.log('🔍 DEBUG - solo backendItems:', backendItems);
          }
        }
      } else {
        console.log('🔍 DEBUG - nessun ordine corrente');
        // LOGICA UNIFICATA PER TAVOLI SENZA ORDINE
        setExistingOrderId(null)
        setExistingOrderStatus(null)
        setExistingOrderItems([])
        
        // 1. Se ci sono items da location.state, usali (caso navigation da categoria)
        if (passedState.orderItems && passedState.orderItems.length > 0) {
          console.log('🔍 DEBUG - usando passedState.orderItems per tavolo libero:', passedState.orderItems);
          const itemsWithFlags = passedState.orderItems.map(item => ({
            ...item,
            isExisting: false // Tutti gli items sono nuovi per tavolo libero
          }))
          setNewItems(itemsWithFlags)
          setOrderItems(itemsWithFlags)
        } else {
          // 2. Se passedState è vuoto, controlla items locali (caso aggiunta diretta)
          const localItems = orderItems.filter(item => !item.isExisting);
          console.log('🔍 DEBUG - usando items locali per tavolo libero:', localItems);
          
          if (localItems.length > 0) {
            setNewItems(localItems)
            setOrderItems(localItems)
          } else {
            // 3. Nessun item, stato pulito
            setNewItems([])
            setOrderItems([])
          }
        }
        
        setCovers(passedState.covers || 1)
      }
    } else {
      console.log('🔍 DEBUG - nessun tavolo');
    }
  }, [table, passedState])

  // Calcola totali usando il servizio centralizzato
  const totals = useMemo(() => {
    return OrderCalculator.calculateTotals(orderItems, covers, isAsporto);
  }, [orderItems, covers, isAsporto])

  // Controlla se ci sono nuovi items
  const hasNewItems = newItems.length > 0

  // Mutation crea ordine e invia subito
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      console.log('🔍 [STEP 8] createOrderMutation.mutationFn chiamato con:', orderData);
      console.log('🔍 [STEP 8] Tipi dati in mutation:', {
        table_id: typeof orderData.table_id,
        covers: typeof orderData.covers,
        status: typeof orderData.status,
        items: typeof orderData.items,
        itemsLength: orderData.items?.length
      });
      
      // Crea l'ordine
      const order = await ordersService.create(orderData)
      console.log('🔍 [STEP 9] Ordine creato:', order);
      
      // Invia subito l'ordine (per passare tavolo a occupied)
      console.log('🔍 [STEP 9.1] Invio ordine:', order.id);
      const sentOrder = await ordersService.send(order.id)
      console.log('🔍 [STEP 9.2] Ordine inviato:', sentOrder);
      
      return sentOrder
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table', tableId] })
      setConfirmModalOpen(false)
      unlockTable()
      navigate(homePath)
    },
    onError: (error) => {
      alert('Errore nella creazione ordine: ' + (error.response?.data?.error || error.message))
    }
  })

  // Mutation invia ordine
  const sendOrderMutation = useMutation({
    mutationFn: (orderId) => ordersService.send(orderId),
    onSuccess: () => {
      // Invalida tutte le query tables e quella specifica del tavolo
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table', tableId] })
      setConfirmModalOpen(false)
      unlockTable()
      navigate(homePath)
    },
    onError: (error) => {
      alert('Errore invio ordine: ' + (error.response?.data?.error || error.message))
    }
  })

  // Mutation libera tavolo
  const freeTableMutation = useMutation({
    mutationFn: async () => {
      console.log('🔍 DEBUG - freeTableMutation.mutate() chiamato per tavolo:', tableId);
      try {
        const result = await tablesService.free(tableId);
        console.log('🔍 DEBUG - Risposta liberazione tavolo:', result);
        return result;
      } catch (error) {
        console.error('❌ DEBUG - Errore liberazione tavolo:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('✅ DEBUG - Liberazione tavolo completata con successo');
      // Invalida tutte le query tables e quella specifica del tavolo
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table', tableId] });
      // Torna alla lista tavoli
      unlockTable()
      navigate(homePath);
    },
    onError: (error) => {
      console.error('❌ DEBUG - Errore liberazione tavolo completo:', error);
      console.error('❌ DEBUG - Tipo errore:', typeof error);
      console.error('❌ DEBUG - Error response:', error.response);
      console.error('❌ DEBUG - Error response data:', error.response?.data);
      console.error('❌ DEBUG - Error response data error:', error.response?.data?.error);
      console.error('❌ DEBUG - Stringify completo errore:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Errore sconosciuto';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }
      
      alert('Errore liberazione tavolo: ' + errorMessage);
    }
  })

  // Mutation salva ordine come pending (senza inviare)
  const saveOrderPendingMutation = useMutation({
    mutationFn: async (orderData) => {
      if (existingOrderId && existingOrderStatus === 'pending') {
        // Aggiorna ordine esistente
        return ordersService.update(existingOrderId, orderData)
      } else if (existingOrderId && existingOrderStatus === 'sent') {
        // NON creare ordini su tavoli già inviati - questo non dovrebbe succedere
        throw new Error('Impossibile salvare ordine su tavolo già inviato')
      } else {
        // Crea nuovo ordine (rimane pending)
        return ordersService.create(orderData)
      }
    },
    onSuccess: () => {
      // Invalida tutte le query tables e quella specifica del tavolo
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table', tableId] })
      unlockTable()
      navigate(homePath)
    },
    onError: (error) => {
      console.error('Errore salvataggio ordine:', error)
      unlockTable()
      navigate(homePath)
    }
  })

  // Mutation annulla comanda (solo per ordini pending)
  const cancelOrderMutation = useMutation({
    mutationFn: () => ordersService.cancel(existingOrderId),
    onSuccess: () => {
      // Invalida tutte le query tables e quella specifica del tavolo
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table', tableId] })
      unlockTable()
      navigate(homePath)
    },
    onError: (error) => {
      alert('Errore annullamento comanda: ' + (error.response?.data?.error || error.message))
    }
  })

  // Handler click categoria -> naviga a pagina prodotti
  const handleCategoryClick = (category) => {
    const catPath = isMonitor ? `/monitor/category/${category.code}` : `/tablet/category/${category.code}`
    navigate(catPath, {
      state: { 
        tableId, 
        orderItems, 
        covers,
        existingOrderId,
        existingOrderStatus
      }
    })
  }

  // Ricerca globale prodotti - filtra tutti i prodotti di tutte le categorie
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
    return results.slice(0, 10) // Limita a 10 risultati
  }, [productSearch, menu])

  // Handler click su prodotto dalla ricerca
  const handleSearchProductClick = (product) => {
    setSelectedProduct(product)
    setProductModalOpen(true)
    setProductSearch('')
  }

  // Handler aggiungi prodotto dal modal
  const handleAddProduct = (productData) => {
    const isGeneric = selectedProduct.is_generic || selectedProduct.code?.startsWith('GENERICO_')
    // Usa prezzo modificato se disponibile (admin), altrimenti prezzo originale
    let finalPrice = parseFloat(selectedProduct.price || 0)
    if (isGeneric) {
      finalPrice = productData.customPrice
    } else if (productData.editedPrice !== null && productData.editedPrice !== undefined) {
      finalPrice = productData.editedPrice
    }
    if (productData.isGift) {
      finalPrice = 0
    }
    
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
      unitPrice: finalPrice,
      supplementsTotal: productData.isGift ? 0 : productData.supplements.reduce((sum, s) => sum + parseFloat(s.price), 0),
      isExisting: false, // Flag per nuovi items
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

  // Handler modifica prezzo (solo admin/monitor)
  const handleStartEditPrice = (item) => {
    setEditingPriceId(item.id)
    setEditingPriceValue(item.unitPrice.toFixed(2))
  }

  const handleSavePrice = (itemId) => {
    const newPrice = parseFloat(editingPriceValue) || 0
    setOrderItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, unitPrice: newPrice } : item
    ))
    setNewItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, unitPrice: newPrice } : item
    ))
    setEditingPriceId(null)
    setEditingPriceValue('')
  }

  const handleCancelEditPrice = () => {
    setEditingPriceId(null)
    setEditingPriceValue('')
  }

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
    console.log('🔍 [STEP 1] handleSendOrder - existingOrderStatus:', existingOrderStatus);
    console.log('🔍 [STEP 1] handleSendOrder - newItems.length:', newItems.length);
    console.log('🔍 [STEP 1] handleSendOrder - newItems:', newItems);
    
    // Per ordini aggiuntivi su tavoli occupied, aggiungi items all'ordine esistente
    if (existingOrderStatus === 'sent' && newItems.length > 0) {
      console.log('🔍 [STEP 2] Caso: Comanda aggiuntiva su tavolo occupied');
      console.log('🔍 [STEP 2] existingOrderId:', existingOrderId);
      
      const itemsData = {
        items: newItems.map(item => ({
          product_code: item.productCode,
          product_name: item.productName,
          category: item.categoryCode,
          flavors: item.flavors || [],
          quantity: item.quantity,
          course: item.course,
          custom_note: item.note,
          unit_price: parseFloat(item.unitPrice),
          supplements_total: parseFloat(item.supplementsTotal || 0),
        }))
      }
      
      console.log('🔍 [STEP 3] Items da aggiungere:', itemsData);
      
      // Aggiungi items all'ordine esistente e poi invia
      try {
        await ordersService.addItems(existingOrderId, itemsData.items)
        console.log('🔍 [STEP 3.1] Items aggiunti, ora invio...');
        sendOrderMutation.mutate(existingOrderId)
      } catch (err) {
        alert('Errore aggiunta prodotti: ' + (err.response?.data?.error || err.message))
      }
      return
    }

    console.log('🔍 [STEP 4] Caso: Ordine normale/tavolo libero');
    const orderData = {
      table_id: isAsporto ? null : parseInt(tableId),
      covers: isAsporto ? 0 : covers,
      status: existingOrderStatus === 'sent' ? 'sent' : undefined, // Per ordini aggiuntivi su tavoli occupied
      items: orderItems.map(item => ({
        product_code: item.productCode,
        product_name: item.productName,
        category: item.categoryCode,
        flavors: item.flavors || [],
        quantity: item.quantity,
        course: item.course,
        custom_note: item.note,
        unit_price: parseFloat(item.unitPrice), // IMPORTANTE: converti in numero
        supplements_total: parseFloat(item.supplementsTotal || 0), // Aggiungi supplements_total
      }))
    }
    
    console.log('🔍 [STEP 5] Payload normale costruito:', orderData);
    console.log('🔍 [STEP 5] Tipi dati normali:', {
      table_id: typeof orderData.table_id,
      covers: typeof orderData.covers,
      status: typeof orderData.status,
      items: typeof orderData.items,
      itemsLength: orderData.items?.length
    });

    if (existingOrderId && existingOrderStatus === 'pending') {
      console.log('🔍 [STEP 6] Aggiornamento ordine pending');
      try {
        await ordersService.update(existingOrderId, orderData)
        sendOrderMutation.mutate(existingOrderId)
      } catch (err) {
        alert('Errore aggiornamento: ' + (err.response?.data?.error || err.message))
      }
    } else {
      console.log('🔍 [STEP 7] Creazione nuovo ordine');
      createOrderMutation.mutate(orderData)
    }
  }

  // Handler torna indietro - salva ordine come pending solo se ci sono NUOVI items
  // Non salva se l'ordine è già stato inviato (sent) o se ci sono solo items esistenti
  const handleGoBack = () => {
    // Se l'ordine è già inviato (tavolo occupied), non salvare - torna semplicemente indietro
    if (existingOrderStatus === 'sent') {
      unlockTable()
      navigate(homePath)
      return
    }

    // Se ci sono NUOVI items (non esistenti), salva come pending prima di tornare indietro
    if (newItems.length > 0 && !isAsporto) {
      const orderData = {
        table_id: parseInt(tableId),
        covers: covers,
        items: orderItems.map(item => ({
          product_code: item.productCode,
          product_name: item.productName,
          category: item.categoryCode,
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
      saveOrderPendingMutation.mutate(orderData)
    } else {
      unlockTable()
      navigate(homePath)
    }
  }

  const isLoading = tableLoading || menuLoading
  const isSending = createOrderMutation.isPending || sendOrderMutation.isPending

  if (isLoading) {
    return (
      <div className={`tablet-order ${isMonitor ? 'monitor-order' : ''}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  const categories = menu?.categories || []

  return (
    <div className={`tablet-order ${isMonitor ? 'monitor-order' : ''}`}>
      {/* Header minimal */}
      <div className="order-header order-header-minimal">
        <div className="table-info">
          <h2>
            {isAsporto ? 'Asporto' : `Tavolo ${table?.number}`}
          </h2>
        </div>
        {!isAsporto && (
          <div className="covers-selector">
            <span>Coperti:</span>
            <Counter
              value={covers}
              onChange={setCovers}
              min={1}
              max={20}
              size="small"
            />
          </div>
        )}
        {/* Menu hamburger */}
        <div className="header-menu-container">
          <button 
            className="header-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          {menuOpen && (
            <div className="header-menu-dropdown">
              {(table?.status === 'pending' || (orderItems.length > 0 && !existingOrderId)) && (
                <button
                  className="header-menu-item header-menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    if (existingOrderId) {
                      freeTableMutation.mutate();
                    } else {
                      // Se non c'è ordine esistente, svuota e torna indietro
                      setOrderItems([]);
                      setNewItems([]);
                      unlockTable();
                      navigate(homePath);
                    }
                  }}
                  disabled={freeTableMutation.isPending}
                >
                  Annulla comanda
                </button>
              )}
              {table?.status === 'occupied' && (
                <button 
                  className="header-menu-item header-menu-item-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm('Vuoi chiudere il tavolo e stampare il preconto?')) {
                      freeTableMutation.mutate();
                    }
                  }}
                  disabled={freeTableMutation.isPending}
                >
                  Libera Tavolo
                </button>
              )}
              <button
                className="header-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vista condizionale: Categorie o Riepilogo */}
      {!showSummary ? (
        /* VISTA CATEGORIE (default) */
        <div className="order-content order-content-fullwidth">
          <div className="order-menu order-menu-fullwidth">
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

          {/* Tasti fissi in basso */}
          <div className={`floating-btns-container ${isMonitor ? 'monitor-floating' : ''}`}>
            <button 
              className="floating-back-btn"
              onClick={handleGoBack}
            >
              ← Indietro
            </button>
            {orderItems.length > 0 ? (
              <button 
                className="floating-review-btn"
                onClick={() => setShowSummary(true)}
              >
                <span className="floating-review-count">{orderItems.length}</span>
                <span className="floating-review-text">Rivedi ed invia comanda</span>
                <span className="floating-review-total">€{totals.total.toFixed(2)}</span>
              </button>
            ) : (
              <button 
                className="floating-review-btn floating-review-btn-disabled"
                disabled
              >
                <span className="floating-review-count">0</span>
                <span className="floating-review-text">Rivedi ed invia comanda</span>
                <span className="floating-review-total">€0.00</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* VISTA RIEPILOGO ORDINE */
        <div className={`order-content order-content-summary ${isMonitor ? 'monitor-content' : ''}`}>
          <div className="order-summary order-summary-fullscreen">
            <div className="summary-header">
              <button className="back-to-categories-btn" onClick={() => setShowSummary(false)}>
                ← Torna alle categorie
              </button>
              <h3>Riepilogo Ordine</h3>
            </div>

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
                          disabled={item.isExisting}
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
                        {(item.note && item.note.trim()) || (item.custom_note && item.custom_note.trim()) ? (
                          <span className="order-item-note">Note: {item.note || item.custom_note}</span>
                        ) : null}
                        {/* Modifica prezzo - solo admin */}
                        {isMonitor && (
                          <div className="order-item-price-edit">
                            {editingPriceId === item.id ? (
                              <div className="price-edit-row">
                                <span>Prezzo: €</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="price-edit-input"
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                  autoFocus
                                />
                                <button className="price-save-btn" onClick={() => handleSavePrice(item.id)}>✓</button>
                                <button className="price-cancel-btn" onClick={handleCancelEditPrice}>✕</button>
                              </div>
                            ) : (
                              <button 
                                className="price-edit-btn"
                                onClick={() => handleStartEditPrice(item)}
                              >
                                Prezzo: €{item.unitPrice.toFixed(2)} ✏️
                              </button>
                            )}
                          </div>
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

            {/* Pulsanti azione - diversi in base allo stato */}
            <div className="order-actions">
              {existingOrderStatus === 'sent' ? (
                <>
                  <button className="btn-secondary" onClick={() => setShowSummary(false)}>
                    ← Aggiungi altri
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmOrder}
                    disabled={!hasNewItems}
                  >
                    Invia Comanda
                  </button>
                </>
              ) : existingOrderStatus === 'pending' ? (
                <>
                  <button className="btn-secondary" onClick={() => setShowSummary(false)}>
                    ← Aggiungi altri
                  </button>
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
                    disabled={orderItems.length === 0}
                  >
                    Invia Comanda
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setShowSummary(false)}>
                    ← Aggiungi altri
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmOrder}
                    disabled={orderItems.length === 0}
                  >
                    Invia Comanda
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
              disabled={isSending}
            >
              Annulla
            </button>
            <button
              className="btn-primary"
              onClick={handleSendOrder}
              disabled={isSending}
            >
              {isSending ? 'Invio...' : 'Conferma e Invia'}
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
              <div key={idx} className="confirm-item">
                <div className="confirm-item-main">
                  <div className="confirm-item-name">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    {item.flavors.length > 0 && (
                      <span className="confirm-item-flavors">
                        - {item.flavors.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="confirm-item-price">
                    €{((item.unitPrice + item.supplementsTotal) * item.quantity).toFixed(2)}
                  </div>
                </div>
                {(item.note || item.custom_note) && (
                  <div className="confirm-item-note">
                    Note: {item.note || item.custom_note}
                  </div>
                )}
                {item.supplements && item.supplements.length > 0 && (
                  <div className="confirm-item-supplements">
                    + {item.supplements.map(s => s.name).join(', ')}
                  </div>
                )}
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
        isMonitor={isMonitor}
      />
    </div>
  )
}

export default TabletOrder
