# 🔄 Guida Socket.IO per Frontend Vicanto POS

## 📡 Eventi Real-Time Disponibili

### 🎯 Eventi Ordine
```javascript
socket.on('order:new', (data) => {
  // Nuovo ordine creato
  console.log('Nuovo ordine:', data.order);
});

socket.on('order:items_added', (data) => {
  // ⭐ IMPORTANTE: Prodotti aggiunti a ordine esistente
  console.log('Prodotti aggiunti:', data.order);
  console.log('Tavolo aggiornato:', data.table);
  
  // Aggiorna UI immediatamente!
  updateTableStatus(data.table);
  updateOrderItems(data.order);
});

socket.on('order:sent', (data) => {
  // Ordine inviato in cucina
  console.log('Ordine inviato:', data.order);
});

socket.on('order:updated', (data) => {
  // Ordine aggiornato
  console.log('Ordine aggiornato:', data.order);
});
```

### 🍽️ Eventi Tavolo
```javascript
socket.on('table:updated', (table) => {
  // ⭐ CRITICO: Aggiornamento stato tavolo
  console.log('Tavolo aggiornato:', table);
  console.log('Nuovo status:', table.status);
  
  // Aggiorna UI del tavolo
  updateTableInUI(table);
});
```

## 🔧 Implementazione Frontend

### 1. Connessione e Autenticazione
```javascript
import { io } from 'socket.io-client';

// Connessione con autenticazione
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token') // JWT token
  }
});

socket.on('connect', () => {
  console.log('✅ Connesso a Socket.IO');
  
  // Entra nelle stanze appropriate
  socket.emit('join', { room: 'tablets' }); // Per camerieri
  // socket.emit('join', { room: 'monitor' }); // Per cucina
});
```

### 2. Gestione Aggiunta Prodotti
```javascript
// Quando aggiungi prodotti a un ordine:
const addItemsToOrder = async (orderId, items) => {
  try {
    // Chiamata API
    const response = await fetch(`/api/orders/${orderId}/items`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // ⚠️ NON FARE REFRESH MANUALE!
      // L'evento Socket.IO aggiornerà l'UI automaticamente
      console.log('Prodotti aggiunti con successo');
    }
  } catch (error) {
    console.error('Errore:', error);
  }
};
```

### 3. Aggiornamento UI React
```javascript
const [tables, setTables] = useState([]);
const [orders, setOrders] = useState({});

useEffect(() => {
  // Ascolta eventi Socket.IO
  socket.on('table:updated', (table) => {
    setTables(prev => prev.map(t => 
      t.id === table.id ? table : t
    ));
  });

  socket.on('order:items_added', (data) => {
    // Aggiorna ordine nel locale state
    setOrders(prev => ({
      ...prev,
      [data.order.id]: data.order
    }));
    
    // Aggiorna tavolo
    setTables(prev => prev.map(t => 
      t.id === data.table.id ? data.table : t
    ));
  });

  return () => {
    socket.off('table:updated');
    socket.off('order:items_added');
  };
}, []);
```

## 🚀 Best Practices

### ✅ Cosa Fare
1. **Ascoltare sempre `table:updated`** per aggiornamenti stato tavoli
2. **Ascoltare `order:items_added`** per aggiunte prodotti
3. **Usare state management** (React Context, Redux, etc.)
4. **Mostrare notifiche** per aggiornamenti real-time
5. **Gestire disconnessioni** e riconnessioni

### ❌ Cosa Evitare
1. **Refresh manuale** dopo aggiunta prodotti
2. **Polling** invece di Socket.IO
3. **Ignorare eventi** di aggiornamento
4. **State duplicato** tra API e Socket.IO

## 🐛 Debug Eventi

### Abilita Logging Socket.IO
```javascript
socket.on('connect', () => {
  console.log('🔌 Socket.IO connesso');
});

socket.on('disconnect', () => {
  console.log('❌ Socket.IO disconnesso');
});

// Ascolta tutti gli eventi per debug
socket.onAny((eventName, ...args) => {
  console.log(`📡 Evento ricevuto: ${eventName}`, args);
});
```

### Verifica Stanze
```javascript
socket.on('connect', () => {
  // Verifica di essere nella stanza corretta
  console.log('Stanze attive:', socket.rooms);
});
```

## 🎯 Flusso Completo Aggiunta Prodotti

1. **Utente aggiunge prodotto** → `PUT /api/orders/:id/items`
2. **Backend aggiorna database** → Calcola nuovi totali
3. **Backend emette eventi**:
   - `order:items_added` (con ordine e tavolo aggiornati)
   - `table:updated` (per compatibilità)
4. **Frontend riceve eventi** → Aggiorna UI in real-time
5. **Nessun refresh necessario** ✅

## 📱 Esempio Componente React

```jsx
function TableCard({ table }) {
  const [currentOrder, setCurrentOrder] = useState(null);

  useEffect(() => {
    // Ascolta aggiornamenti tavolo
    socket.on('table:updated', (updatedTable) => {
      if (updatedTable.id === table.id) {
        // Aggiorna stato locale
        setTableState(updatedTable);
      }
    });

    return () => socket.off('table:updated');
  }, [table.id]);

  const handleAddItems = async (items) => {
    await addItemsToOrder(currentOrder.id, items);
    // NON fare refresh - Socket.IO gestirà l'aggiornamento
  };

  return (
    <div className={`table-card table-${table.status}`}>
      <h3>Tavolo {table.number}</h3>
      <p>Status: {table.status}</p>
      <p>Totale: €{table.total}</p>
      {currentOrder && (
        <button onClick={() => handleAddItems([{product_id: 1, quantity: 1}])}>
          Aggiungi Prodotto
        </button>
      )}
    </div>
  );
}
```

---

## 🎉 Risultato Finale

Con questa implementazione, quando aggiungi prodotti a un ordine:
- ✅ **Backend** aggiorna database e calcola totali
- ✅ **Socket.IO** emette eventi in tempo reale  
- ✅ **Frontend** riceve eventi e aggiorna UI automaticamente
- ✅ **Nessun refresh** manuale necessario
- ✅ **UX fluida** e reattiva

Il sistema Vicanto POS è ora completamente real-time! 🚀
