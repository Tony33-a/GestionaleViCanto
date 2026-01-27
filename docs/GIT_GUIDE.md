# Guida Git per ViCanto POS

Questa guida spiega come organizzare i commit per pubblicare il progetto su GitHub in modo professionale.

---

## Strategia di Commit Consigliata

### Opzione 1: Commit Atomici (Consigliata per CV)

Organizza la history come se il progetto fosse stato sviluppato progressivamente. Questo mostra competenza nel version control.

```bash
# 1. Setup iniziale
git commit -m "chore: setup iniziale progetto con struttura cartelle"

# 2. Database
git commit -m "feat(db): aggiungi schema database e migrations"

# 3. Backend base
git commit -m "feat(api): implementa autenticazione JWT"
git commit -m "feat(api): aggiungi CRUD tavoli"
git commit -m "feat(api): aggiungi CRUD ordini con transazioni"
git commit -m "feat(api): aggiungi gestione menu"

# 4. Real-time
git commit -m "feat(socket): implementa Socket.IO per real-time updates"

# 5. Frontend base
git commit -m "feat(ui): setup React con Vite e routing"
git commit -m "feat(ui): implementa pagina login"
git commit -m "feat(ui): implementa layout tablet per camerieri"
git commit -m "feat(ui): implementa layout monitor per admin"

# 6. Funzionalita principali
git commit -m "feat(orders): implementa flusso creazione ordine"
git commit -m "feat(tables): aggiungi gestione stato tavoli real-time"
git commit -m "feat(menu): implementa CRUD menu con UI"

# 7. Sistema stampa
git commit -m "feat(print): implementa servizio stampa termica"
git commit -m "feat(print): aggiungi modalita PDF per testing"

# 8. Dashboard e report
git commit -m "feat(dashboard): aggiungi KPI e grafici real-time"
git commit -m "feat(reports): implementa export PDF e Excel"

# 9. Documentazione
git commit -m "docs: aggiungi README professionale"
git commit -m "docs: aggiungi documentazione API"
```

### Opzione 2: Single Commit (Piu Semplice)

Se preferisci non ricostruire la history:

```bash
git add .
git commit -m "feat: ViCanto POS - Sistema gestionale completo per gelateria

- Backend Node.js/Express con API REST complete
- Frontend React con interfaccia tablet e monitor
- Real-time updates con Socket.IO
- Sistema stampa termica integrato
- Dashboard con KPI e report
- Gestione menu, tavoli, ordini e utenti"
```

---

## Come Ricostruire la History

Se vuoi commit atomici partendo da un progetto esistente:

### Metodo 1: Interactive Rebase (Avanzato)

```bash
# NON FARE SE NON HAI ESPERIENZA CON GIT
git rebase -i --root
```

### Metodo 2: Nuovo Repository (Consigliato)

```bash
# 1. Crea un nuovo repo
mkdir vicanto-clean
cd vicanto-clean
git init

# 2. Copia i file a gruppi e committa progressivamente
# Esempio: prima solo backend/config e package.json
cp -r ../vicanto/backend/config ./backend/
cp ../vicanto/backend/package.json ./backend/
git add .
git commit -m "chore: setup backend con configurazioni"

# 3. Aggiungi i modelli
cp -r ../vicanto/backend/models ./backend/
git add .
git commit -m "feat(db): aggiungi modelli database"

# ... continua cosi per ogni gruppo di file
```

### Metodo 3: Squash e Rinomina (Intermedio)

```bash
# Se hai gia molti commit disordinati
git reset --soft HEAD~N  # N = numero commit da unire
git commit -m "feat: implementa sistema completo ordini"
```

---

## Commit Messages Professionali

### Formato Conventional Commits

```
<tipo>(<ambito>): <descrizione>

[corpo opzionale]

[footer opzionale]
```

### Tipi Principali

| Tipo | Quando usarlo |
|------|---------------|
| `feat` | Nuova funzionalita |
| `fix` | Correzione bug |
| `docs` | Solo documentazione |
| `style` | Formattazione (no logic) |
| `refactor` | Refactoring codice |
| `test` | Aggiunta test |
| `chore` | Build, config, deps |
| `perf` | Miglioramenti performance |

### Esempi Reali per ViCanto

```bash
# Funzionalita
feat(api): aggiungi endpoint gestione ordini con validazione
feat(ui): implementa modal selezione gusti prodotto
feat(print): aggiungi retry automatico stampa fallita

# Bug fix
fix(orders): correggi calcolo totale con supplementi
fix(socket): risolvi disconnessione su cambio pagina

# Documentazione
docs: aggiungi guida installazione in README
docs(api): documenta endpoint autenticazione

# Refactoring
refactor(models): estrai logica comune in BaseModel
refactor(components): converti TableCard in functional component

# Performance
perf(queries): ottimizza query ordini con eager loading
perf(socket): implementa event batching per ridurre traffico
```

---

## Sequenza Commit Suggerita per CV

Ecco una sequenza realistica che mostra progressione nello sviluppo:

```
1. chore: inizializza progetto Node.js/React
2. feat(db): configura PostgreSQL con Knex migrations
3. feat(auth): implementa autenticazione JWT con PIN
4. feat(tables): aggiungi modello e API tavoli
5. feat(orders): implementa gestione ordini con transazioni
6. feat(menu): aggiungi CRUD categorie e prodotti
7. feat(socket): integra Socket.IO per real-time
8. feat(ui): crea layout base React con routing
9. feat(ui): implementa interfaccia tablet camerieri
10. feat(ui): implementa dashboard admin
11. feat(print): integra stampa termica ESC/POS
12. feat(reports): aggiungi export PDF/Excel
13. docs: completa documentazione progetto
14. chore: prepara per deployment
```

---

## Branch Strategy

Per un progetto portfolio, puoi usare:

```
main                 # Codice stabile, pronto per demo
├── develop          # Sviluppo attivo (opzionale)
├── feature/xyz      # Branch per nuove feature
└── fix/abc          # Branch per bug fix
```

### Workflow Base

```bash
# Sviluppa su branch
git checkout -b feature/export-pdf
# ... lavora ...
git commit -m "feat(reports): aggiungi export PDF ordini"

# Mergia in main
git checkout main
git merge feature/export-pdf
git push origin main

# Elimina branch
git branch -d feature/export-pdf
```

---

## Checklist Pre-Push

Prima di pushare su GitHub pubblico:

- [ ] Rimuovi dati sensibili (.env, password, API keys)
- [ ] Verifica che .gitignore escluda i file corretti
- [ ] Controlla che non ci siano credenziali hardcoded
- [ ] README e contiene istruzioni chiare
- [ ] Il progetto funziona dopo un clone fresco
- [ ] Commit messages sono chiari e professionali

---

## Comandi Utili

```bash
# Vedi history
git log --oneline -20

# Modifica ultimo commit message
git commit --amend -m "nuovo messaggio"

# Vedi differenze staged
git diff --staged

# Annulla ultimo commit (mantieni modifiche)
git reset --soft HEAD~1

# Verifica stato
git status

# Vedi branch
git branch -a
```

---

## Risorse

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://sethrobertson.github.io/GitBestPractices/)
- [How to Write a Git Commit Message](https://cbea.ms/git-commit/)
