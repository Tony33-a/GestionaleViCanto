# API Documentation

Documentazione completa delle API REST di ViCanto POS.

**Base URL**: `http://localhost:3000/api`

**Autenticazione**: Bearer Token (JWT)

---

## Indice

- [Autenticazione](#autenticazione)
- [Tavoli](#tavoli)
- [Ordini](#ordini)
- [Menu](#menu)
- [Utenti](#utenti)
- [Report](#report)
- [Health Check](#health-check)
- [Codici di Errore](#codici-di-errore)

---

## Autenticazione

Tutte le richieste (eccetto login e health check) richiedono un header di autenticazione:

```http
Authorization: Bearer <token>
```

### POST /auth/login

Autentica un utente e restituisce un JWT token.

**Request Body**:
```json
{
  "username": "admin",
  "pin": "1234"
}
```

**Response 200**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

**Response 401**:
```json
{
  "success": false,
  "message": "Credenziali non valide"
}
```

---

## Tavoli

### GET /tables

Restituisce la lista di tutti i tavoli.

**Query Parameters**:
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| status | string | Filtra per stato: `free`, `pending`, `occupied` |

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "number": 1,
      "status": "free",
      "covers": 0,
      "total": "0.00",
      "current_order_id": null
    },
    {
      "id": 2,
      "number": 2,
      "status": "occupied",
      "covers": 4,
      "total": "45.50",
      "current_order_id": 123
    }
  ]
}
```

### GET /tables/:id

Restituisce i dettagli di un tavolo specifico con l'ordine attivo.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "number": 2,
    "status": "occupied",
    "covers": 4,
    "total": "45.50",
    "order": {
      "id": 123,
      "status": "active",
      "items": [
        {
          "id": 1,
          "product_name": "Cono 2 Gusti",
          "quantity": 2,
          "unit_price": "4.00",
          "flavors": ["Cioccolato", "Pistacchio"],
          "supplements": ["Panna"],
          "notes": null
        }
      ]
    }
  }
}
```

### PUT /tables/:id

Aggiorna lo stato di un tavolo.

**Request Body**:
```json
{
  "status": "pending",
  "covers": 4
}
```

**Response 200**:
```json
{
  "success": true,
  "message": "Tavolo aggiornato",
  "data": {
    "id": 2,
    "number": 2,
    "status": "pending",
    "covers": 4
  }
}
```

### PUT /tables/:id/free

Libera un tavolo (completa l'ordine e stampa preconto).

**Response 200**:
```json
{
  "success": true,
  "message": "Tavolo liberato e preconto stampato"
}
```

---

## Ordini

### GET /orders

Restituisce la lista degli ordini con filtri opzionali.

**Query Parameters**:
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| status | string | `active`, `completed`, `cancelled` |
| from | date | Data inizio (YYYY-MM-DD) |
| to | date | Data fine (YYYY-MM-DD) |
| table_id | integer | Filtra per tavolo |

**Response 200**:
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 123,
      "table_id": 2,
      "table_number": 2,
      "waiter_username": "mario",
      "status": "completed",
      "covers": 4,
      "total": "45.50",
      "created_at": "2026-01-27T10:30:00.000Z",
      "completed_at": "2026-01-27T11:45:00.000Z"
    }
  ]
}
```

### GET /orders/active

Restituisce solo gli ordini attivi.

### GET /orders/:id

Restituisce i dettagli completi di un ordine.

**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "table_id": 2,
    "table_number": 2,
    "waiter_id": 5,
    "waiter_username": "mario",
    "status": "active",
    "covers": 4,
    "total": "45.50",
    "created_at": "2026-01-27T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "product_name": "Cono 2 Gusti",
        "category_code": "CAT_CONI",
        "quantity": 2,
        "unit_price": "4.00",
        "total_price": "8.00",
        "flavors": ["Cioccolato", "Pistacchio"],
        "supplements": [
          {"name": "Panna", "price": "0.50"}
        ],
        "notes": "Senza cialda"
      }
    ]
  }
}
```

### POST /orders

Crea un nuovo ordine.

**Request Body**:
```json
{
  "table_id": 2,
  "covers": 4,
  "items": [
    {
      "product_code": "CONO_2G",
      "product_name": "Cono 2 Gusti",
      "category_code": "CAT_CONI",
      "quantity": 2,
      "unit_price": 4.00,
      "flavors": ["Cioccolato", "Pistacchio"],
      "supplements": [
        {"name": "Panna", "price": 0.50}
      ],
      "notes": "Senza cialda"
    }
  ]
}
```

**Response 201**:
```json
{
  "success": true,
  "message": "Ordine creato",
  "data": {
    "id": 124,
    "table_id": 2,
    "status": "active",
    "total": "9.00"
  }
}
```

### PUT /orders/:id/send

Invia l'ordine (trigger stampa comanda).

**Response 200**:
```json
{
  "success": true,
  "message": "Comanda inviata alla stampa"
}
```

### PUT /orders/:id/complete

Completa un ordine.

### DELETE /orders/:id

Elimina un ordine (solo se in stato pending).

---

## Menu

### GET /menu/categories

Restituisce tutte le categorie del menu.

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "CAT_CONI",
      "name": "Coni",
      "icon": "cone",
      "display_order": 1,
      "is_active": true
    }
  ]
}
```

### POST /menu/categories

Crea una nuova categoria.

### PUT /menu/categories/:id

Aggiorna una categoria.

### DELETE /menu/categories/:id

Elimina una categoria.

---

### GET /menu/products

Restituisce tutti i prodotti.

**Query Parameters**:
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| category_code | string | Filtra per categoria |
| is_available | boolean | Solo disponibili |

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "CONO_2G",
      "name": "Cono 2 Gusti",
      "category_code": "CAT_CONI",
      "price": "4.00",
      "has_flavors": true,
      "max_flavors": 2,
      "is_available": true
    }
  ]
}
```

---

### GET /menu/flavors

Restituisce tutti i gusti.

**Query Parameters**:
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| category_code | string | Filtra per categoria |

---

### GET /menu/supplements

Restituisce tutti i supplementi.

---

## Utenti

### GET /users

Restituisce la lista degli utenti (solo admin).

### POST /users

Crea un nuovo utente.

**Request Body**:
```json
{
  "username": "giovanni",
  "pin": "5678",
  "first_name": "Giovanni",
  "last_name": "Rossi",
  "role": "waiter"
}
```

### PUT /users/:id

Aggiorna un utente.

### DELETE /users/:id

Disattiva un utente (soft delete).

---

## Report

### GET /reports/dashboard

Statistiche per la dashboard.

**Query Parameters**:
| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| from | date | Data inizio |
| to | date | Data fine |

**Response 200**:
```json
{
  "success": true,
  "data": {
    "total_orders": 45,
    "total_revenue": "1250.50",
    "average_ticket": "27.79",
    "total_covers": 120,
    "tables_served": 18
  }
}
```

### GET /reports/daily

Report giornaliero dettagliato.

### GET /reports/weekly

Report settimanale.

### GET /reports/monthly

Report mensile.

---

## Health Check

### GET /health

Health check base.

**Response 200**:
```json
{
  "status": "OK",
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

### GET /health/db

Verifica connessione database.

### GET /health/all

Health check completo di tutti i servizi.

**Response 200**:
```json
{
  "status": "healthy",
  "services": {
    "api": "OK",
    "database": "OK",
    "socketio": "OK"
  },
  "uptime": 3600,
  "timestamp": "2026-01-27T12:00:00.000Z"
}
```

---

## Codici di Errore

| Codice | Descrizione |
|--------|-------------|
| 200 | OK - Richiesta completata con successo |
| 201 | Created - Risorsa creata con successo |
| 400 | Bad Request - Parametri mancanti o non validi |
| 401 | Unauthorized - Token mancante o non valido |
| 403 | Forbidden - Permessi insufficienti |
| 404 | Not Found - Risorsa non trovata |
| 409 | Conflict - Conflitto (es. tavolo gia occupato) |
| 429 | Too Many Requests - Rate limit superato |
| 500 | Internal Server Error - Errore del server |

**Formato errore standard**:
```json
{
  "success": false,
  "message": "Descrizione dell'errore",
  "error": {
    "code": "ERROR_CODE",
    "details": "Dettagli aggiuntivi"
  }
}
```

---

## Rate Limiting

Le API sono protette da rate limiting:

| Endpoint | Limite |
|----------|--------|
| GET /orders/* | 100 richieste/minuto |
| POST /orders | 50 richieste/minuto |
| Altri endpoint | 100 richieste/minuto |

Header di risposta:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706356800
```

---

## WebSocket Events

Il server supporta Socket.IO per aggiornamenti real-time.

**Connessione**:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'Bearer <jwt_token>' }
});
```

**Eventi emessi dal server**:
- `table:updated` - Stato tavolo aggiornato
- `order:new` - Nuovo ordine creato
- `order:sent` - Ordine inviato
- `order:completed` - Ordine completato
- `print:success` - Stampa completata
- `print:failed` - Stampa fallita

**Rooms**:
- `monitor` - Per dashboard admin
- `tablets` - Per tablet camerieri

---

## Esempi con cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","pin":"1234"}'

# Lista tavoli
curl http://localhost:3000/api/tables \
  -H "Authorization: Bearer <token>"

# Crea ordine
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "table_id": 2,
    "covers": 4,
    "items": [...]
  }'
```
