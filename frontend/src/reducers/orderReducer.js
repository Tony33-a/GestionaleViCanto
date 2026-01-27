/**
 * Order Reducer - Gestione centralizzata stato ordine
 * Sostituisce 10+ useState con sincronizzazione manuale
 */

// Actions types
const ORDER_ACTIONS = {
  // Table e ordine esistente
  SET_TABLE_DATA: 'SET_TABLE_DATA',
  SET_EXISTING_ORDER: 'SET_EXISTING_ORDER',
  
  // Items management
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  CLEAR_ITEMS: 'CLEAR_ITEMS',
  
  // UI state
  SET_COVERS: 'SET_COVERS',
  SET_SEARCH: 'SET_SEARCH',
  SET_SELECTED_PRODUCT: 'SET_SELECTED_PRODUCT',
  TOGGLE_MODAL: 'TOGGLE_MODAL',
  TOGGLE_CONFIRM_MODAL: 'TOGGLE_CONFIRM_MODAL'
};

// Initial state
const initialState = {
  // Table data
  table: null,
  isAsporto: false,
  
  // Existing order
  existingOrderId: null,
  existingOrderStatus: null,
  existingOrderItems: [],
  
  // Current order items
  orderItems: [],
  newItems: [],
  
  // UI state
  covers: 1,
  productSearch: '',
  selectedProduct: null,
  productModalOpen: false,
  confirmModalOpen: false,
  
  // Loading states
  loading: false,
  error: null
};

// Action creators
export const orderActions = {
  setTableData: (table, isAsporto) => ({
    type: ORDER_ACTIONS.SET_TABLE_DATA,
    payload: { table, isAsporto }
  }),
  
  setExistingOrder: (order) => ({
    type: ORDER_ACTIONS.SET_EXISTING_ORDER,
    payload: order
  }),
  
  addItem: (item) => ({
    type: ORDER_ACTIONS.ADD_ITEM,
    payload: item
  }),
  
  removeItem: (itemId) => ({
    type: ORDER_ACTIONS.REMOVE_ITEM,
    payload: itemId
  }),
  
  updateItem: (itemId, updates) => ({
    type: ORDER_ACTIONS.UPDATE_ITEM,
    payload: { itemId, updates }
  }),
  
  clearItems: () => ({
    type: ORDER_ACTIONS.CLEAR_ITEMS
  }),
  
  setCovers: (covers) => ({
    type: ORDER_ACTIONS.SET_COVERS,
    payload: covers
  }),
  
  setSearch: (search) => ({
    type: ORDER_ACTIONS.SET_SEARCH,
    payload: search
  }),
  
  setSelectedProduct: (product) => ({
    type: ORDER_ACTIONS.SET_SELECTED_PRODUCT,
    payload: product
  }),
  
  toggleProductModal: (open) => ({
    type: ORDER_ACTIONS.TOGGLE_MODAL,
    payload: open
  }),
  
  toggleConfirmModal: (open) => ({
    type: ORDER_ACTIONS.TOGGLE_CONFIRM_MODAL,
    payload: open
  }),
  
  setLoading: (loading) => ({
    type: 'SET_LOADING',
    payload: loading
  }),
  
  setError: (error) => ({
    type: 'SET_ERROR',
    payload: error
  })
};

// Reducer
export const orderReducer = (state = initialState, action) => {
  switch (action.type) {
    case ORDER_ACTIONS.SET_TABLE_DATA:
      return {
        ...state,
        table: action.payload.table,
        isAsporto: action.payload.isAsporto
      };
      
    case ORDER_ACTIONS.SET_EXISTING_ORDER:
      const order = action.payload;
      if (!order) {
        return {
          ...state,
          existingOrderId: null,
          existingOrderStatus: null,
          existingOrderItems: [],
          orderItems: [],
          newItems: []
        };
      }
      
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
            isExisting: true,
          }))
        : [];
      
      return {
        ...state,
        existingOrderId: order.id,
        existingOrderStatus: order.status,
        existingOrderItems: backendItems,
        orderItems: backendItems,
        newItems: [],
        covers: order.covers || 1
      };
      
    case ORDER_ACTIONS.ADD_ITEM:
      const newItem = {
        ...action.payload,
        id: Date.now() + Math.random(),
        isExisting: false
      };
      
      return {
        ...state,
        orderItems: [...state.orderItems, newItem],
        newItems: [...state.newItems, newItem]
      };
      
    case ORDER_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        orderItems: state.orderItems.filter(item => item.id !== action.payload),
        newItems: state.newItems.filter(item => item.id !== action.payload)
      };
      
    case ORDER_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        orderItems: state.orderItems.map(item => 
          item.id === action.payload.itemId 
            ? { ...item, ...action.payload.updates }
            : item
        ),
        newItems: state.newItems.map(item => 
          item.id === action.payload.itemId 
            ? { ...item, ...action.payload.updates }
            : item
        )
      };
      
    case ORDER_ACTIONS.CLEAR_ITEMS:
      return {
        ...state,
        orderItems: state.existingOrderItems,
        newItems: []
      };
      
    case ORDER_ACTIONS.SET_COVERS:
      return {
        ...state,
        covers: action.payload
      };
      
    case ORDER_ACTIONS.SET_SEARCH:
      return {
        ...state,
        productSearch: action.payload
      };
      
    case ORDER_ACTIONS.SET_SELECTED_PRODUCT:
      return {
        ...state,
        selectedProduct: action.payload
      };
      
    case ORDER_ACTIONS.TOGGLE_MODAL:
      return {
        ...state,
        productModalOpen: action.payload
      };
      
    case ORDER_ACTIONS.TOGGLE_CONFIRM_MODAL:
      return {
        ...state,
        confirmModalOpen: action.payload
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    default:
      return state;
  }
};

export { ORDER_ACTIONS, initialState };
