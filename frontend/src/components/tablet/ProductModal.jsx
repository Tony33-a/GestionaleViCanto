import { useState, useEffect, useMemo } from 'react'
import Modal from '../common/Modal'
import './ProductModal.css'

/**
 * Modal per configurare prodotto prima di aggiungerlo all'ordine
 */
function ProductModal({
  isOpen,
  onClose,
  product,
  flavors = [],
  supplements = [],
  onAdd,
  isMonitor = false
}) {
  const [selectedFlavors, setSelectedFlavors] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [selectedSupplements, setSelectedSupplements] = useState([])
  const [supplementSearch, setSupplementSearch] = useState('')
  // Campi per prodotto generico
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  // Prezzo modificato (solo admin/monitor)
  const [editedPrice, setEditedPrice] = useState('')

  // Reset state quando si apre modal
  useEffect(() => {
    if (isOpen && product) {
      setSelectedFlavors([])
      setQuantity(1)
      setNote('')
      setSelectedSupplements([])
      setSupplementSearch('')
      setCustomName('')
      setCustomPrice('')
      setEditedPrice(product.price ? parseFloat(product.price).toFixed(2) : '')
    }
  }, [isOpen, product])

  // Logica supplementi per categoria/prodotto
  const isBevanda = product?.category_code === 'CAT_BEVANDE' || product?.categoryCode === 'CAT_BEVANDE'
  const isPatatine = product?.category_code === 'CAT_PATATINE' || product?.categoryCode === 'CAT_PATATINE'
  const isGranite = product?.category_code === 'CAT_GRANITE' || product?.categoryCode === 'CAT_GRANITE'
  const isCorona = product?.code === 'BEV_CORONA'
  
  // Prodotti categoria Altro senza supplementi
  const altroNoSupplements = ['affogato al caffe', 'frutta di stagione', 'sgroppino', 'spaghetti ice']
  const isAltroNoSupp = altroNoSupplements.some(name => 
    product?.name?.toLowerCase().includes(name.toLowerCase())
  )
  
  // Prodotti categoria Altro con gusti
  const altroWithFlavors = ['poke', 'spongato in vetro']
  const isAltroWithFlavors = altroWithFlavors.some(name => 
    product?.name?.toLowerCase().includes(name.toLowerCase())
  )

  // Filtra supplementi disponibili per questo prodotto
  const availableSupplements = useMemo(() => {
    if (!product) return []
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
      return supplements.filter(s => {
        const name = s.name.toLowerCase()
        return name.startsWith('topping') && 
               !name.includes('caramello') && 
               !name.includes('cioccolato bianco')
      })
    }
    if (isCorona) {
      // Corona: solo Sale e limone
      return supplements.filter(s => s.code === 'SUPP_SALE_LIMONE' || s.name.toLowerCase().includes('sale e limone'))
    }
    // Altri prodotti: tutti i supplementi
    return supplements
  }, [product, supplements, isBevanda, isPatatine, isGranite, isCorona, isAltroNoSupp])

  // Filtra supplementi per ricerca - DEVE essere chiamato sempre
  const filteredSupplements = useMemo(() => {
    if (!supplementSearch.trim()) return availableSupplements
    const search = supplementSearch.toLowerCase()
    return availableSupplements.filter(s => s.name.toLowerCase().includes(search))
  }, [availableSupplements, supplementSearch])

  // Se non c'è prodotto o modal chiuso, renderizza Modal chiuso
  if (!product) {
    return null
  }

  const productName = product.name || 'Prodotto'
  const basePrice = parseFloat(product.price || 0)
  // Abilita gusti se prodotto li ha O se è poke/spongato in vetro
  const hasFlavors = (product.has_flavors || isAltroWithFlavors) && flavors.length > 0
  const isGeneric = product.is_generic || product.code?.startsWith('GENERICO_')

  // Toggle gusto (selezione multipla)
  const handleFlavorToggle = (flavor) => {
    setSelectedFlavors(prev => {
      const exists = prev.find(f => f.id === flavor.id)
      if (exists) {
        return prev.filter(f => f.id !== flavor.id)
      } else {
        return [...prev, flavor]
      }
    })
  }

  // Toggle supplemento
  const handleSupplementToggle = (supplement) => {
    setSelectedSupplements(prev => {
      const exists = prev.find(s => s.id === supplement.id)
      if (exists) {
        return prev.filter(s => s.id !== supplement.id)
      } else {
        return [...prev, supplement]
      }
    })
  }

  // Verifica se può confermare
  // - Se ha gusti: almeno un gusto selezionato
  // - Se è generico: nome e prezzo obbligatori
  const canConfirm = (!hasFlavors || selectedFlavors.length > 0) &&
    (!isGeneric || (customName.trim() && customPrice && parseFloat(customPrice) >= 0))

  // Handler conferma
  const handleConfirm = () => {
    if (!canConfirm) {
      if (isGeneric && !customName.trim()) {
        alert('Inserisci il nome del prodotto')
        return
      }
      if (isGeneric && (!customPrice || parseFloat(customPrice) < 0)) {
        alert('Inserisci un prezzo valido')
        return
      }
      alert('Seleziona almeno un gusto')
      return
    }
    onAdd({
      flavors: selectedFlavors,
      quantity,
      course: 1,
      note,
      isGift: false,
      supplements: selectedSupplements,
      // Dati custom per prodotto generico
      customName: isGeneric ? customName.trim() : null,
      customPrice: isGeneric ? parseFloat(customPrice) : null,
      // Prezzo modificato (solo admin/monitor)
      editedPrice: isMonitor && editedPrice ? parseFloat(editedPrice) : null,
    })
  }

  // Counter handlers
  const decreaseQty = () => setQuantity(prev => Math.max(1, prev - 1))
  const increaseQty = () => setQuantity(prev => Math.min(20, prev + 1))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productName}
      size="large"
      showClose={true}
      footer={
        <>
          <button className="modal-btn-cancel-red" onClick={onClose}>
            ANNULLA
          </button>
          <button
            className="modal-btn-confirm-green"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            AGGIUNGI ALL'ORDINE
          </button>
        </>
      }
    >
      <div className="product-modal-content-new">
        {/* Campi per prodotto generico */}
        {isGeneric && (
          <div className="pm-section pm-generic-fields">
            <div className="pm-row pm-row-generic">
              <span className="pm-label">Nome prodotto *</span>
              <input
                type="text"
                className="pm-generic-input"
                placeholder="Es. Torta della nonna"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="pm-row pm-row-generic">
              <span className="pm-label">Prezzo (€) *</span>
              <input
                type="number"
                className="pm-generic-input pm-price-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Gusti (se il prodotto li richiede) - selezione multipla */}
        {hasFlavors && (
          <div className="pm-section pm-flavors">
            <div className="pm-flavors-header">
              <h4>Seleziona gusti *</h4>
              {selectedFlavors.length > 0 && (
                <span className="pm-flavors-count">{selectedFlavors.length} selezionati</span>
              )}
            </div>
            <div className="pm-flavors-grid">
              {flavors.map((flavor) => {
                const isSelected = selectedFlavors.find(f => f.id === flavor.id)
                return (
                  <button
                    key={flavor.id}
                    className={`pm-flavor-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFlavorToggle(flavor)}
                  >
                    {flavor.name}
                    {isSelected && <span className="pm-flavor-check"></span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quantità */}
        <div className="pm-row">
          <span className="pm-label">Quantità</span>
          <div className="pm-counter">
            <button
              className="pm-counter-btn pm-counter-minus"
              onClick={decreaseQty}
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="pm-counter-value">{quantity}</span>
            <button
              className="pm-counter-btn pm-counter-plus"
              onClick={increaseQty}
              disabled={quantity >= 20}
            >
              +
            </button>
          </div>
        </div>

        {/* Modifica Prezzo - solo admin/monitor */}
        {isMonitor && !isGeneric && (
          <div className="pm-row pm-row-price">
            <span className="pm-label">Prezzo (€)</span>
            <input
              type="number"
              className="pm-price-edit-input"
              min="0"
              step="0.01"
              value={editedPrice}
              onChange={(e) => setEditedPrice(e.target.value)}
            />
          </div>
        )}

        {/* Note */}
        <div className="pm-row pm-row-note">
          <span className="pm-label">Note</span>
          <input
            type="text"
            className="pm-note-input"
            placeholder=""
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Supplementi */}
        {availableSupplements.length > 0 && (
          <div className="pm-section pm-supplements">
            <div className="pm-supplements-header">
              <span className="pm-label">Supplementi</span>
              {selectedSupplements.length > 0 && (
                <span className="pm-supplements-selected">
                  +{selectedSupplements.map(s => s.name).join(', ')}
                </span>
              )}
            </div>

            {/* Search */}
            <div className="pm-search-container">
              <input
                type="text"
                className="pm-search-input"
                placeholder="Cerca supplemento..."
                value={supplementSearch}
                onChange={(e) => setSupplementSearch(e.target.value)}
              />
            </div>

            {/* Supplements list */}
            <div className="pm-supplements-list">
              {filteredSupplements.map((supplement) => {
                const isSelected = selectedSupplements.find(s => s.id === supplement.id)
                return (
                  <div
                    key={supplement.id}
                    className={`pm-supplement-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSupplementToggle(supplement)}
                  >
                    <span className="pm-supplement-name">{supplement.name}</span>
                    <span className="pm-supplement-price">+€{parseFloat(supplement.price).toFixed(2)}</span>
                    <label className="pm-checkbox-container">
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => {}}
                      />
                      <span className="pm-checkmark"></span>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ProductModal
