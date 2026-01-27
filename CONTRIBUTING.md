# Contribuire a ViCanto POS

Grazie per il tuo interesse a contribuire a ViCanto POS! Questo documento fornisce le linee guida per contribuire al progetto.

## Indice

- [Codice di Condotta](#codice-di-condotta)
- [Come Contribuire](#come-contribuire)
- [Segnalare Bug](#segnalare-bug)
- [Proporre Nuove Funzionalita](#proporre-nuove-funzionalita)
- [Processo di Pull Request](#processo-di-pull-request)
- [Stile del Codice](#stile-del-codice)
- [Commit Messages](#commit-messages)
- [Struttura del Progetto](#struttura-del-progetto)

---

## Codice di Condotta

Questo progetto adotta un Codice di Condotta che ci aspettiamo venga rispettato da tutti i partecipanti. Per favore, sii rispettoso e costruttivo nelle interazioni.

---

## Come Contribuire

### 1. Fork del Repository

```bash
# Clona il tuo fork
git clone https://github.com/tuousername/vicanto-pos.git
cd vicanto-pos

# Aggiungi l'upstream
git remote add upstream https://github.com/originalusername/vicanto-pos.git
```

### 2. Crea un Branch

```bash
# Aggiorna main
git checkout main
git pull upstream main

# Crea un nuovo branch
git checkout -b feature/nome-descrittivo
# oppure
git checkout -b fix/descrizione-bug
```

### 3. Sviluppa

- Scrivi codice pulito e ben documentato
- Aggiungi test se necessario
- Aggiorna la documentazione

### 4. Testa

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run lint
```

### 5. Committa e Pusha

```bash
git add .
git commit -m "feat: aggiungi nuova funzionalita"
git push origin feature/nome-descrittivo
```

### 6. Apri una Pull Request

Vai su GitHub e apri una Pull Request dal tuo branch verso `main`.

---

## Segnalare Bug

Prima di segnalare un bug:

1. Verifica che non sia gia stato segnalato
2. Aggiorna all'ultima versione e riprova

Quando segnali un bug, includi:

- **Titolo chiaro** che descriva il problema
- **Passi per riprodurre** il bug
- **Comportamento atteso** vs **comportamento attuale**
- **Screenshot** se applicabile
- **Ambiente**: OS, browser, versione Node.js

Template:
```markdown
## Descrizione
Breve descrizione del bug.

## Passi per Riprodurre
1. Vai a '...'
2. Clicca su '...'
3. Scrolla fino a '...'
4. Vedi errore

## Comportamento Atteso
Descrivi cosa dovrebbe succedere.

## Comportamento Attuale
Descrivi cosa succede invece.

## Screenshot
Se applicabile.

## Ambiente
- OS: [es. Windows 11]
- Browser: [es. Chrome 120]
- Node.js: [es. 18.19.0]
```

---

## Proporre Nuove Funzionalita

Prima di proporre una nuova funzionalita:

1. Verifica che non sia gia stata proposta
2. Considera se e in linea con gli obiettivi del progetto

Quando proponi una funzionalita, includi:

- **Problema** che risolve
- **Soluzione proposta**
- **Alternative** considerate
- **Impatto** sulla codebase esistente

---

## Processo di Pull Request

1. **Descrizione chiara** di cosa fa la PR
2. **Link alla issue** correlata (se presente)
3. **Checklist** completata:
   - [ ] Ho testato le modifiche
   - [ ] Il codice segue lo stile del progetto
   - [ ] Ho aggiornato la documentazione
   - [ ] Tutti i test passano

4. **Review richiesta** - attendi feedback prima del merge

---

## Stile del Codice

### JavaScript/React

- Usa **ES6+** syntax
- **Funzioni freccia** per callback
- **const/let** invece di var
- **Destructuring** quando appropriato
- **Template literals** per stringhe dinamiche

```javascript
// Si
const handleClick = (event) => {
  const { id, name } = event.target;
  console.log(`Clicked: ${name}`);
};

// No
function handleClick(event) {
  var id = event.target.id;
  var name = event.target.name;
  console.log('Clicked: ' + name);
}
```

### React Components

- **Functional components** con hooks
- **Props destructuring** nei parametri
- **useState/useEffect** per stato e side effects

```javascript
// Si
function TableCard({ table, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`table-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(table.id)}
    >
      <span>Tavolo {table.number}</span>
    </div>
  );
}
```

### CSS

- **BEM naming** per classi
- **CSS Variables** per colori e valori comuni
- **Mobile-first** responsive design

```css
/* Si */
.table-card {
  padding: var(--spacing-md);
  background: var(--color-surface);
}

.table-card--occupied {
  background: var(--color-warning);
}

.table-card__number {
  font-size: var(--font-size-lg);
}
```

---

## Commit Messages

Usiamo il formato **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Descrizione |
|------|-------------|
| `feat` | Nuova funzionalita |
| `fix` | Bug fix |
| `docs` | Solo documentazione |
| `style` | Formattazione (no logic changes) |
| `refactor` | Refactoring (no feat/fix) |
| `test` | Aggiunta/modifica test |
| `chore` | Build, config, deps |

### Esempi

```bash
# Nuova funzionalita
git commit -m "feat(orders): aggiungi export PDF ordini"

# Bug fix
git commit -m "fix(tables): correggi lock concorrente sui tavoli"

# Documentazione
git commit -m "docs: aggiorna README con istruzioni installazione"

# Refactoring
git commit -m "refactor(api): estrai logica validazione in middleware"

# Chore
git commit -m "chore(deps): aggiorna React a v18.2.0"
```

---

## Struttura del Progetto

```
vicanto/
├── backend/
│   ├── config/         # Configurazioni
│   ├── controllers/    # Logica business
│   ├── middleware/     # Middleware Express
│   ├── models/         # Data access
│   ├── routes/         # Route definitions
│   ├── services/       # Servizi (Print, etc.)
│   └── socket/         # Socket.IO handlers
│
├── frontend/
│   └── src/
│       ├── components/ # Componenti riutilizzabili
│       ├── layouts/    # Layout pages
│       ├── pages/      # Page components
│       ├── services/   # API clients
│       ├── stores/     # Zustand stores
│       └── styles/     # CSS files
│
├── database/
│   └── migrations/     # Knex migrations
│
└── docs/               # Documentazione
```

### Convenzioni File

- **Components**: PascalCase (`TableCard.jsx`)
- **Services**: camelCase (`ordersService.js`)
- **Styles**: kebab-case (`table-card.css`)
- **Utils**: camelCase (`formatCurrency.js`)

---

## Domande?

Se hai domande, apri una issue o contatta il maintainer.

Grazie per contribuire!
