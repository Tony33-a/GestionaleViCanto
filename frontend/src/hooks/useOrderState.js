/**
 * Hook personalizzato per gestire lo stato dell'ordine
 * Sostituisce 10+ useState con sincronizzazione centralizzata
 */

import { useReducer } from 'react';
import { orderReducer, orderActions, initialState } from '../reducers/orderReducer';

export const useOrderState = (passedState = {}) => {
  const [state, dispatch] = useReducer(orderReducer, {
    ...initialState,
    // Inizializza con dati passati dalla navigazione
    orderItems: passedState.orderItems || [],
    covers: passedState.covers || 1
  });

  // Action wrappers semplificati
  const actions = {
    setTableData: (table, isAsporto) => dispatch(orderActions.setTableData(table, isAsporto)),
    setExistingOrder: (order) => dispatch(orderActions.setExistingOrder(order)),
    addItem: (item) => dispatch(orderActions.addItem(item)),
    removeItem: (itemId) => dispatch(orderActions.removeItem(itemId)),
    updateItem: (itemId, updates) => dispatch(orderActions.updateItem(itemId, updates)),
    clearItems: () => dispatch(orderActions.clearItems()),
    setCovers: (covers) => dispatch(orderActions.setCovers(covers)),
    setSearch: (search) => dispatch(orderActions.setSearch(search)),
    setSelectedProduct: (product) => dispatch(orderActions.setSelectedProduct(product)),
    toggleProductModal: (open) => dispatch(orderActions.toggleProductModal(open)),
    toggleConfirmModal: (open) => dispatch(orderActions.toggleConfirmModal(open)),
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error })
  };

  // Calcoli derivati dallo stato
  const totals = {
    itemsSubtotal: state.orderItems.reduce((sum, item) => {
      const itemTotal = (item.unitPrice + item.supplementsTotal) * item.quantity;
      return sum + itemTotal;
    }, 0),
    coverCharge: state.isAsporto ? 0 : state.covers * 0.20,
  };

  totals.total = totals.itemsSubtotal + totals.coverCharge;

  return {
    // Stato
    ...state,
    
    // Actions semplificate
    ...actions,
    
    // Calcoli derivati
    totals,
    
    // Helper flags
    hasNewItems: state.newItems.length > 0,
    hasItems: state.orderItems.length > 0,
    canSendOrder: state.orderItems.length > 0 && !state.loading,
    isTableOccupied: state.existingOrderStatus === 'sent',
    isTablePending: state.existingOrderStatus === 'pending'
  };
};
