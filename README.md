# ViCanto POS

> Sistema gestionale web per gelateria artigianale con gestione ordini in tempo reale, stampa termica e interfaccia multi-dispositivo.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![ViCanto Dashboard Preview](docs/images/dashboard-preview.png)

---

## Il Problema

Le gelaterie artigianali spesso gestiscono gli ordini ai tavoli con metodi tradizionali: carta e penna, comunicazione verbale, calcoli manuali. Questo porta a:

- **Errori nelle comande** - Ordini persi o sbagliati
- **Tempi di attesa lunghi** - Il cameriere deve tornare al banco per ogni ordine
- **Difficolta nel tracciamento** - Nessuno storico consultabile
- **Calcoli manuali** - Errori nei conti e lentezza alla cassa

## La Soluzione

**ViCanto POS** digitalizza l'intero flusso operativo:

1. Il cameriere apre il tavolo dal tablet
2. Inserisce l'ordine selezionando prodotti, gusti e supplementi
3. Invia la comanda con un tap - la stampante in cucina riceve istantaneamente
4. Il monitor centrale mostra tutti gli ordini in tempo reale
5. Alla chiusura, il preconto viene stampato automaticamente

**Risultato**: servizio piu veloce, zero errori, storico completo, reportistica automatica.

---

## Funzionalita Principali

### Per i Camerieri (Tablet)
- Selezione tavoli con stato visivo (libero/occupato/in attesa)
- Catalogo prodotti organizzato per categoria
- Selezione gusti multipli e supplementi
- Note personalizzate per ogni prodotto
- Invio comanda con conferma visiva
- Visualizzazione riepilogo ordine

### Per l'Amministratore (Monitor)
- Dashboard con KPI in tempo reale (ordini, incasso, scontrino medio)
- Grafici interattivi (istogramma incassi, torta prodotti venduti)
- Storico ordini con filtri per data
- Gestione completa del menu (categorie, prodotti, gusti, supplementi)
- Gestione camerieri (CRUD utenti)
- Export report in PDF e Excel
- Diagnostica stampante

### Sistema di Stampa
- Stampa termica WiFi automatica
- Comanda per cucina con dettagli ordine
- Preconto per cliente con riepilogo completo
- Coda di stampa con retry automatico
- Modalita PDF per testing/archivio

### Real-time
- Sincronizzazione istantanea tra tutti i dispositivi
- Aggiornamento stato tavoli in tempo reale
- Notifiche stampa (successo/errore)
- Lock concorrente sui tavoli (un cameriere alla volta)

---

## Stack Tecnologico

### Backend
| Tecnologia | Versione | Motivazione |
|------------|----------|-------------|
| **Node.js** | 18+ | Runtime JavaScript performante, ideale per I/O asincrono |
| **Express** | 4.x | Framework minimale e flessibile per API REST |
| **Socket.IO** | 4.x | Comunicazione bidirezionale real-time affidabile |
| **PostgreSQL** | 15+ | Database relazionale robusto con supporto JSONB |
| **Knex.js** | 3.x | Query builder con migrations e transazioni |
| **JWT** | - | Autenticazione stateless sicura |
| **Winston** | 3.x | Logging strutturato con rotazione file |

### Frontend
| Tecnologia | Versione | Motivazione |
|------------|----------|-------------|
| **React** | 18 | Libreria UI dichiarativa con hooks moderni |
| **Vite** | 5.x | Build tool velocissimo con HMR istantaneo |
| **React Router** | 6 | Routing dichiarativo per SPA |
| **Zustand** | 4.x | State management minimale e performante |
| **React Query** | 5.x | Data fetching con cache e sincronizzazione |
| **jsPDF** | 2.x | Generazione PDF client-side |
| **SheetJS** | 0.18 | Export Excel nativo |

### Infrastruttura
| Tecnologia | Utilizzo |
|------------|----------|
| **node-thermal-printer** | Driver stampanti ESC/POS |
| **bcrypt** | Hashing password sicuro |
| **Helmet** | Security headers HTTP |
| **express-rate-limit** | Protezione da abusi API |

---

## Architettura

```
+-------------------------------------------------------------------+
|                         FRONTEND                                   |
|  +-------------------+              +-------------------+          |
|  |  Tablet Layout    |              |  Monitor Layout   |          |
|  |   (Camerieri)     |              |     (Admin)       |          |
|  +---------+---------+              +---------+---------+          |
|            |                                  |                    |
|            +----------------+-----------------+                    |
|                             |                                      |
|                    +--------v--------+                             |
|                    |  React + Vite   |                             |
|                    |    Zustand      |                             |
|                    +--------+--------+                             |
+----------------------------|---------------------------------------+
                             | HTTP + WebSocket
+----------------------------|---------------------------------------+
|                            |           BACKEND                     |
|                    +-------v-------+                               |
|                    |    Express    |                               |
|                    |   Socket.IO   |                               |
|                    +-------+-------+                               |
|                            |                                       |
|      +---------------------+---------------------+                 |
|      |                     |                     |                 |
|      v                     v                     v                 |
|  +------+           +----------+          +----------+             |
|  | Auth |           |  Orders  |          |  Print   |             |
|  | JWT  |           |  Tables  |          |  Queue   |             |
|  +------+           |  Menu    |          +----+-----+             |
|                     +----+-----+               |                   |
|                          |                     |                   |
|                          v                     v                   |
|                    +----------+        +--------------+            |
|                    |PostgreSQL|        |Print Service |            |
|                    |  Knex.js |        |  (Processo   |            |
|                    +----------+        |  separato)   |            |
|                                        +------+-------+            |
+-----------------------------------------------|--------------------+
                                                | ESC/POS
                                                v
                                        +---------------+
                                        |   Stampante   |
                                        |   Termica     |
                                        +---------------+
```

### Flusso Dati

1. **Apertura Tavolo**: Cameriere seleziona tavolo -> API aggiorna stato -> Socket notifica tutti i client
2. **Creazione Ordine**: Selezione prodotti -> POST /api/orders -> Transazione DB atomica
3. **Invio Comanda**: PUT /api/orders/:id/send -> Insert in print_queue -> Print Service processa
4. **Chiusura**: "Libera tavolo" -> Stampa preconto -> Ordine completato -> Tavolo libero

### Separazione delle Responsabilita

- **Frontend**: Presentazione e interazione utente (nessuna logica di business)
- **Backend API**: Validazione, business logic, persistenza
- **Print Service**: Processo indipendente per gestione stampa (fault-tolerant)
- **Database**: Source of truth per tutti i dati

---

## Installazione

### Prerequisiti

- Node.js 18+ ([download](https://nodejs.org/))
- PostgreSQL 15+ ([download](https://www.postgresql.org/download/))
- Git

### 1. Clona il Repository

```bash
git clone https://github.com/tuousername/vicanto-pos.git
cd vicanto-pos
```

### 2. Configura il Database

```bash
# Crea il database PostgreSQL
psql -U postgres
CREATE DATABASE vicanto;
\q
```

### 3. Configura le Variabili d'Ambiente

```bash
# Backend
cp backend/.env.example backend/.env
# Modifica backend/.env con le tue credenziali DB
```

```env
# backend/.env
DATABASE_URL=postgres://postgres:password@localhost:5432/vicanto
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
PORT=3000
```

```bash
# Frontend
cp frontend/.env.example frontend/.env
```

```env
# frontend/.env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Installa le Dipendenze

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Esegui le Migrations

```bash
cd backend
npx knex migrate:latest
```

### 6. (Opzionale) Popola con Dati di Test

```bash
cd backend
npx knex seed:run
# oppure
psql -U postgres -d vicanto -f database/seed_official_data.sql
```

### 7. Avvia l'Applicazione

```bash
# Terminal 1 - Backend API
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Print Service (opzionale)
cd backend
npm run print-server:pdf  # Modalita PDF per testing
```

### 8. Accedi all'Applicazione

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health/all

### Credenziali di Test

| Username | PIN | Ruolo |
|----------|-----|-------|
| admin | 1234 | Admin |
| mario | 1111 | Cameriere |

---

## Utilizzo

### Flusso Cameriere (Tablet)

1. **Login** con username e PIN a 4 cifre
2. **Seleziona un tavolo** dalla griglia
3. **Inserisci i coperti** (numero di persone)
4. **Naviga le categorie** (Coni, Coppette, Bevande, etc.)
5. **Seleziona i prodotti** con gusti e supplementi
6. **Rivedi l'ordine** nel riepilogo
7. **Invia la comanda** - stampa automatica in cucina
8. **Libera il tavolo** quando il cliente paga - stampa preconto

### Flusso Amministratore (Monitor)

1. **Login** come admin
2. **Dashboard**: visualizza KPI e grafici in tempo reale
3. **Tavoli**: monitora stato e accedi agli ordini
4. **Statistiche Ordini**: storico con filtri e dettagli
5. **Gestione Menu**: modifica categorie, prodotti, gusti
6. **Gestione Camerieri**: crea/modifica/disattiva utenti
7. **Export**: scarica report in PDF o Excel

---

## Screenshot

> Le immagini sono placeholder - sostituire con screenshot reali

| Dashboard Admin | Tablet - Selezione Tavoli |
|-----------------|---------------------------|
| ![Dashboard](docs/images/dashboard.png) | ![Tavoli](docs/images/tablet-tables.png) |

| Gestione Ordine | Gestione Menu |
|-----------------|---------------|
| ![Ordine](docs/images/order.png) | ![Menu](docs/images/menu-management.png) |

---

## API Reference

### Autenticazione

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "pin": "1234"
}
```

### Tavoli

```http
GET    /api/tables          # Lista tutti i tavoli
GET    /api/tables/:id      # Dettaglio tavolo con ordine attivo
PUT    /api/tables/:id      # Aggiorna stato tavolo
PUT    /api/tables/:id/free # Libera tavolo
```

### Ordini

```http
GET    /api/orders          # Lista ordini (con filtri ?status=&from=&to=)
GET    /api/orders/active   # Ordini attivi
POST   /api/orders          # Crea nuovo ordine
PUT    /api/orders/:id/send # Invia comanda (trigger stampa)
PUT    /api/orders/:id/complete # Completa ordine
DELETE /api/orders/:id      # Elimina ordine
```

### Menu

```http
GET    /api/menu/categories  # Tutte le categorie
POST   /api/menu/categories  # Crea categoria
PUT    /api/menu/categories/:id
DELETE /api/menu/categories/:id

GET    /api/menu/products    # Tutti i prodotti
GET    /api/menu/flavors     # Tutti i gusti
GET    /api/menu/supplements # Tutti i supplementi
```

Documentazione completa: [docs/API.md](docs/API.md)

---

## Testing

```bash
# Health check completo
curl http://localhost:3000/api/health/all

# Test stampa (modalita mock)
npm run print-server:mock

# Test Socket.IO
node backend/test_socket.js
```

---

## Struttura del Progetto

```
vicanto/
├── backend/
│   ├── config/           # Configurazioni (DB, JWT, Logger)
│   ├── controllers/      # Logica business per ogni risorsa
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/           # Data access layer (Knex queries)
│   ├── routes/           # Definizione endpoint API
│   ├── services/         # Servizi (Print, Queue, etc.)
│   ├── socket/           # Gestione eventi Socket.IO
│   └── server.js         # Entry point API
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componenti React riutilizzabili
│   │   ├── layouts/      # Layout (Monitor, Tablet)
│   │   ├── pages/        # Pagine per route
│   │   ├── services/     # API client e Socket
│   │   ├── stores/       # Zustand stores
│   │   └── styles/       # CSS globali
│   └── vite.config.js
│
├── database/
│   └── migrations/       # Knex migrations
│
└── docs/                 # Documentazione aggiuntiva
```

---

## Contribuire

I contributi sono benvenuti! Per contribuire:

1. Fai fork del repository
2. Crea un branch per la feature (`git checkout -b feature/nuova-funzionalita`)
3. Committa le modifiche (`git commit -m 'Aggiunge nuova funzionalita'`)
4. Pusha il branch (`git push origin feature/nuova-funzionalita`)
5. Apri una Pull Request

Leggi [CONTRIBUTING.md](CONTRIBUTING.md) per le linee guida complete.

---

## Licenza

Questo progetto e distribuito sotto licenza MIT. Vedi [LICENSE](LICENSE) per dettagli.

---

## Autore

**Anthony Casuccio**

- GitHub: [@Tony33-a](https://github.com/Tony33-a)


---

## Ringraziamenti

- [Express.js](https://expressjs.com/) - Framework web minimale
- [React](https://reactjs.org/) - Libreria UI
- [Socket.IO](https://socket.io/) - Real-time engine
- [jsPDF](https://github.com/parallax/jsPDF) - Generazione PDF

---

<p align="center">
  Sviluppato con dedizione per digitalizzare il servizio delle gelaterie artigianali
</p>
