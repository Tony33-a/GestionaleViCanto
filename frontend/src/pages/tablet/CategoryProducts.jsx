import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import menuService from '../../services/menuService'
import ProductModal from '../../components/tablet/ProductModal'
import './CategoryProducts.css'

/**
 * Pagina prodotti di una categoria
 * Mostra griglia prodotti quando si clicca su una categoria
 */
function CategoryProducts() {
  const { categoryCode } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Rileva contesto monitor/tablet
  const isMonitor = location.pathname.startsWith('/monitor')
  const orderPath = isMonitor ? `/monitor/order` : `/tablet/order`

  // Dati passati dalla pagina ordine
  const { tableId, orderItems: initialOrderItems = [], covers } = location.state || {}

  const [orderItems, setOrderItems] = useState(initialOrderItems)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Fetch menu completo
  const { data: menu, isLoading: menuLoading, error: menuError } = useQuery({
    queryKey: ['menu'],
    queryFn: menuService.getFullMenu,
    staleTime: 0,
    retry: 2,
  })

  // Trova la categoria corrente
  const category = useMemo(() => {
    if (!menu?.categories) return null
    return menu.categories.find(c => c.code === categoryCode)
  }, [menu, categoryCode])

  const products = category?.products || []
  const flavors = category?.flavors || []
  const supplements = menu?.supplements || []

  // Filtra prodotti per ricerca
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const search = productSearch.toLowerCase()
    return products.filter(p => p.name.toLowerCase().includes(search))
  }, [products, productSearch])

  // Handler selezione prodotto
  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setProductModalOpen(true)
  }

  // Handler aggiungi prodotto
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
      id: Date.now(),
      productCode: selectedProduct.code,
      productName: isGeneric ? productData.customName : selectedProduct.name,
      categoryCode: category.code,
      flavors: productData.flavors ? productData.flavors.map(f => f.name) : [],
      quantity: productData.quantity,
      course: productData.course,
      note: productData.note,
      isGift: productData.isGift || false,
      supplements: productData.supplements,
      unitPrice: finalPrice,
      supplementsTotal: productData.isGift ? 0 : productData.supplements.reduce((sum, s) => sum + parseFloat(s.price), 0),
      isGeneric: isGeneric,
    }
    setOrderItems([...orderItems, newItem])
    setProductModalOpen(false)
    setSelectedProduct(null)
  }

  // Calcola totale ordine
  const orderTotal = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => {
      return sum + (item.unitPrice + item.supplementsTotal) * item.quantity
    }, 0)
    const coverCharge = (covers || 1) * 0.20
    return subtotal + coverCharge
  }, [orderItems, covers])

  // Handler per tornare al riepilogo ordine
  const handleGoToOrder = () => {
    navigate(`${orderPath}/${tableId}`, { 
      state: { 
        covers, 
        orderItems,
        fromCategory: true,
        showSummary: true // Mostra direttamente il riepilogo
      } 
    })
  }

  // Handler per tornare indietro (categorie)lla pagina ordine con gli items)
  const handleGoBack = () => {
    navigate(`${orderPath}/${tableId}`, {
      state: { orderItems, covers }
    })
  }

  if (menuLoading) {
    return (
      <div className={`category-products-page ${isMonitor ? 'monitor-products' : ''}`}>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className={`category-products-page ${isMonitor ? 'monitor-products' : ''}`}>
        <div className="error-state">
          <p>Categoria non trovata</p>
          <button onClick={() => navigate(-1)}>Torna indietro</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`category-products-page ${isMonitor ? 'monitor-products' : ''}`}>
      {/* Header */}
      <div className="cp-header">
        <button className="cp-back-btn" onClick={handleGoBack}>
          &larr;
        </button>
        <h1>{category.name}</h1>
        {orderItems.length > 0 && (
          <div className="cp-items-badge cp-clickable" onClick={handleGoToOrder}>
            <span className="cp-items-number">{orderItems.length}</span>
            <span className="cp-items-text">prodotti</span>
          </div>
        )}
      </div>

      {/* Barra ricerca prodotti nella categoria */}
      <div className="cp-search-section">
        <div className="cp-search-container">
          <span className="cp-search-icon">🔍</span>
          <input
            type="text"
            className="cp-search-input"
            placeholder="Cerca in questa categoria..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {productSearch && (
            <button
              className="cp-search-clear"
              onClick={() => setProductSearch('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Griglia prodotti */}
      <div className="cp-content cp-content-with-footer">
        <div className="cp-products-grid">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              className="cp-product-btn"
              onClick={() => handleProductSelect(product)}
            >
              <span className="cp-product-name">{product.name}</span>
              <span className="cp-product-price">{product.price ? `€${parseFloat(product.price).toFixed(2)}` : 'Var.'}</span>
              {product.has_flavors && <span className="cp-flavors-badge">+ gusti</span>}
            </button>
          ))}
          {filteredProducts.length === 0 && productSearch && (
            <div className="cp-no-results">
              Nessun prodotto trovato per "{productSearch}"
            </div>
          )}
        </div>
      </div>

      {/* Tasti fissi in basso */}
      <div className="floating-btns-container">
        <button 
          className="floating-back-btn"
          onClick={handleGoBack}
        >
          ← Indietro
        </button>
        {orderItems.length > 0 ? (
          <button 
            className="floating-review-btn"
            onClick={handleGoToOrder}
          >
            <span className="floating-review-count">{orderItems.length}</span>
            <span className="floating-review-text">Rivedi ed invia comanda</span>
            <span className="floating-review-total">€{orderTotal.toFixed(2)}</span>
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

      {/* Modal Prodotto */}
      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={selectedProduct}
        flavors={flavors}
        supplements={supplements}
        onAdd={handleAddProduct}
        isMonitor={isMonitor}
      />
    </div>
  )
}

export default CategoryProducts
