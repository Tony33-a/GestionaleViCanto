# 🍦 Nuove Modifiche - Adattamento Vicanto POS a Gelateria

**Data:** 20 Gennaio 2026  
**Versione:** 2.0.0-gelateria

---

## 📋 Riepilogo Generale

Il sistema Vicanto POS è stato adattato alle specifiche del progetto Gelateria. Le modifiche includono:
- Gestione lock concorrente dei tavoli
- Flussi operativi conformi (LIBERO → IN ATTESA → OCCUPATO)
- Sistema comande multiple per ordine
- Stampa preconto automatica alla liberazione tavolo
- Dashboard amministrativa con report
- Logging persistente delle operazioni critiche

---

## 🔒 1. Lock Concorrente Tavoli

### Descrizione
Impedisce a più utenti di modificare lo stesso tavolo contemporaneamente.

### File Creati/Modificati
- `database/migrations/20260120190000_add_table_lock_fields.js`
- `backend/models/Table.js` (aggiornato con metodi lock/unlock)
- `backend/controllers/tableLockController.js`
- `backend/routes/tableLocks.js`

### Nuove Colonne Database (tabella `tables`)
```sql
locked_by    INTEGER REFERENCES users(id)
locked_at    TIMESTAMP
```

### Nuovi Endpoint API
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/tables/:id/lock` | Acquisisci lock sul tavolo |
| POST | `/api/tables/:id/unlock` | Rilascia lock sul tavolo |
| GET | `/api/tables/:id/lock-status` | Verifica stato lock |
| POST | `/api/tables/cleanup-locks` | Pulizia lock scaduti |

### Funzionamento
- Lock automatico all'apertura tavolo
- Timeout lock: 30 minuti (configurabile)
- Pulizia automatica lock scaduti
- Messaggio errore se tavolo già in uso

---

## 🔄 2. Flussi Operativi Tavoli

### Descrizione
Implementazione dei flussi operativi conformi alle specifiche gelateria.

### Stati Tavolo
1. **LIBERO** (`free`) - Tavolo disponibile
2. **IN ATTESA** (`pending`) - Tavolo aperto, coperti selezionati
3. **OCCUPATO** (`occupied`) - Almeno una comanda inviata

### File Creati
- `backend/middleware/tableFlow.js`
- `backend/controllers/tableFlowController.js`
- `backend/routes/tableFlows.js`

### Nuovi Endpoint API
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/tables/open` | Apri tavolo (LIBERO → IN ATTESA) |
| PUT | `/api/tables/:id/items` | Aggiungi prodotti |
| PUT | `/api/tables/:id/send-order` | Invia comanda |
| DELETE | `/api/tables/:id/cancel-order` | Annulla comanda |
| POST | `/api/tables/:id/free` | Libera tavolo |

### Flusso Operativo
```
LIBERO
   │
   ▼ (POST /open con coperti)
IN ATTESA
   │
   ▼ (PUT /items + PUT /send-order)
OCCUPATO
   │
   ├──▶ (PUT /items + PUT /send-order) → Nuova comanda
   │
   ▼ (POST /free)
LIBERO + Stampa Preconto
```

---

## 📦 3. Sistema Comande Multiple

### Descrizione
Ogni ordine può avere N comande. Ogni invio genera una nuova comanda numerata.

### File Creati
- `database/migrations/20260120192200_create_commands_table.js`
- `database/migrations/20260120192300_add_command_id_to_order_items.js`
- `backend/models/Command.js`

### Nuova Tabella Database: `commands`
```sql
id              SERIAL PRIMARY KEY
order_id        INTEGER REFERENCES orders(id)
command_number  INTEGER NOT NULL  -- Numerazione interna (1, 2, 3...)
status          ENUM('pending', 'sent', 'printed', 'print_failed')
print_status    ENUM('pending', 'printed', 'failed')
created_at      TIMESTAMP
sent_at         TIMESTAMP
printed_at      TIMESTAMP
notes           TEXT
```

### Modifica Tabella `order_items`
```sql
command_id      INTEGER REFERENCES commands(id)  -- Collega item a comanda specifica
```

### Funzionamento
1. Apri tavolo → Crea ordine (nessuna comanda ancora)
2. Aggiungi prodotti → Items con `command_id = NULL`
3. Invia comanda → Crea comanda #1, associa items
4. Aggiungi altri prodotti → Nuovi items con `command_id = NULL`
5. Invia comanda → Crea comanda #2, associa solo nuovi items
6. Ripeti...

### Log Console
```
📤 [SERVICE] Creata comanda #1 per ordine #109 con 2 items
📤 [SERVICE] Creata comanda #2 per ordine #109 con 1 items
```

---

## 🧾 4. Stampa Preconto alla Chiusura

### Descrizione
Alla liberazione del tavolo viene automaticamente creato un job di stampa preconto.

### File Modificati
- `database/migrations/20260120192700_add_print_type_to_print_queue.js`
- `backend/models/PrintQueue.js` (aggiunto metodo `createPreconto`)
- `backend/controllers/tableFlowController.js`

### Modifica Tabella `print_queue`
```sql
print_type      ENUM('comanda', 'preconto') DEFAULT 'comanda'
```

### Funzionamento
- `POST /api/tables/:id/free` → Crea job stampa tipo `preconto`
- Il preconto include tutti gli ordini del tavolo
- Stampa automatica tramite QueueWatcher esistente

### Log Console
```
🧾 [PRINT] Creato job stampa preconto per ordine #109
🧾 [FLOW] Preconto creato per 1 ordini del tavolo 17
```

---

## 📊 5. Dashboard Admin con Report

### Descrizione
Pannello amministrativo con statistiche e report dettagliati.

### File Creati
- `backend/controllers/reportController.js`
- `backend/routes/reports.js`

### Nuovi Endpoint API (Solo Admin)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/reports/dashboard` | Statistiche live |
| GET | `/api/reports/orders` | Storico ordini filtrato |
| GET | `/api/reports/daily` | Report giornaliero |
| GET | `/api/reports/weekly` | Report settimanale |
| GET | `/api/reports/monthly` | Report mensile |

### Dashboard (`/api/reports/dashboard`)
```json
{
  "date": "2026-01-20",
  "orders": {
    "total": 16,
    "completed": 9,
    "revenue": 145.50
  },
  "tables": {
    "active": 2
  },
  "top_products": [...],
  "print": {
    "pending": 0,
    "errors": 0
  }
}
```

### Report Giornaliero (`/api/reports/daily?date=2026-01-20`)
- Totali (ordini, incasso, coperti, scontrino medio)
- Vendite per categoria
- Vendite per prodotto (top 20)
- Distribuzione oraria

### Report Settimanale (`/api/reports/weekly?week=2026-W03`)
- Totali settimana
- Andamento giornaliero

### Report Mensile (`/api/reports/monthly?month=2026-01`)
- Totali mese
- Media giornaliera
- Andamento settimanale
- Top 10 prodotti

---

## 📝 6. Logging Persistente Operazioni Critiche

### Descrizione
Tracciamento persistente su database di tutte le operazioni critiche per audit e debugging.

### File Creati
- `database/migrations/20260120193000_create_operation_logs_table.js`
- `backend/services/operationLogger.js`

### Nuova Tabella Database: `operation_logs`
```sql
id              SERIAL PRIMARY KEY
operation       ENUM('table_open', 'order_send', 'order_complete', 
                     'order_cancel', 'table_free', 'print_success', 
                     'print_failed', 'login', 'logout')
user_id         INTEGER REFERENCES users(id)
table_id        INTEGER REFERENCES tables(id)
order_id        INTEGER REFERENCES orders(id)
details         JSONB           -- Dettagli aggiuntivi
error_message   TEXT
error_stack     TEXT
ip_address      VARCHAR(45)
created_at      TIMESTAMP
```

### Operazioni Loggate
| Operazione | Trigger |
|------------|---------|
| `table_open` | Apertura tavolo |
| `order_send` | Invio comanda |
| `order_complete` | Completamento ordine |
| `order_cancel` | Annullamento ordine |
| `table_free` | Liberazione tavolo |
| `print_success` | Stampa riuscita |
| `print_failed` | Errore stampa |
| `login` | Login utente |

### Metodi Disponibili
```javascript
OperationLogger.logTableOpen(userId, tableId, tableNumber, covers, ip)
OperationLogger.logOrderSend(userId, orderId, tableId, commandNumber, itemsCount, ip)
OperationLogger.logTableFree(userId, tableId, tableNumber, totalRevenue, ip)
OperationLogger.logPrintFailed(orderId, printType, errorMessage, errorStack)
OperationLogger.getLogs(filters)        // Recupera log con filtri
OperationLogger.getRecentErrors(limit)  // Errori recenti
OperationLogger.countTodayErrors()      // Conta errori oggi
```

### Log Console
```
📋 [LOG] table_open: { userId: 1, tableId: 17, orderId: null }
📋 [LOG] order_send: { userId: 1, tableId: 17, orderId: 110 }
📋 [LOG] table_free: { userId: 1, tableId: 17, orderId: null }
```

---

## 🗂️ Riepilogo Migrations

```
Batch 5: 20260120190000_add_table_lock_fields.js
Batch 6: 20260120192200_create_commands_table.js
         20260120192300_add_command_id_to_order_items.js
Batch 7: 20260120192700_add_print_type_to_print_queue.js
Batch 8: 20260120193000_create_operation_logs_table.js
```

Per eseguire le migrations:
```bash
cd backend
npm run migrate
```

---

## 🔧 Configurazione

### Variabili Ambiente (.env)
Nessuna nuova variabile richiesta. Le modifiche utilizzano la configurazione esistente.

### Rate Limiting
- Lock tavoli: max 30 richieste/minuto per IP
- Flussi operativi: max 50 richieste/minuto per IP

---

## 🧪 Test API

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pin":"1234"}'
```

### Apri Tavolo
```bash
curl -X POST http://localhost:3000/api/tables/open \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"table_id":17,"covers":2}'
```

### Aggiungi Prodotti
```bash
curl -X PUT http://localhost:3000/api/tables/17/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":1,"quantity":2,"unit_price":5.00,"category_code":"gelati"}]}'
```

### Invia Comanda
```bash
curl -X PUT http://localhost:3000/api/tables/17/send-order \
  -H "Authorization: Bearer <token>"
```

### Libera Tavolo
```bash
curl -X POST http://localhost:3000/api/tables/17/free \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Dashboard Admin
```bash
curl -X GET http://localhost:3000/api/reports/dashboard \
  -H "Authorization: Bearer <token>"
```

---

## 📌 Note Importanti

1. **Compatibilità:** Le modifiche sono retrocompatibili con il frontend esistente
2. **Real-time:** Tutti gli eventi Socket.IO esistenti continuano a funzionare
3. **Transazioni:** Tutte le operazioni critiche sono atomiche (Knex transactions)
4. **Sicurezza:** I report sono accessibili solo agli admin (`requireAdmin` middleware)

---

## 🚀 Prossimi Passi Suggeriti

1. Implementare la UI frontend per la selezione coperti
2. Aggiungere notifiche push per errori stampa
3. Implementare export report in PDF/Excel
4. Aggiungere gestione turni camerieri
5. Implementare sistema promozioni/sconti
