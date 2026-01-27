Project Spec Gestionale Gelateria
Gestionale Gelateria – Specifica di Progetto
1. Obiettivo del progetto

Questo progetto è un gestionale web per una singola gelateria, progettato esclusivamente per la gestione operativa degli ordini ai tavoli.

Il sistema non ha finalità fiscali e non sostituisce registratori di cassa o software contabili. L’obiettivo è:

velocizzare il servizio

ridurre errori nelle comande

mantenere uno storico chiaro e consultabile

Il gestionale è utilizzato in tempo reale da:

1 monitor principale (banco / cassa)

2 smartphone (camerieri)

Caratteristiche chiave:

Web app totalmente online

Lingua: italiano

Interfaccia minimale, moderna e professionale

Progettato per personale non tecnico

Nessun requisito di scalabilità

2. Architettura

Frontend web app

Backend dedicato

Database unico

Vincoli architetturali:

Il backend è l’unica fonte di verità

Tutte le operazioni critiche devono essere transazionali

Nessuna logica di stato affidata esclusivamente al frontend

Sono richiesti:

Log persistenti delle operazioni critiche

Log degli errori

Notifiche di errori gravi visibili dal profilo admin

Backup e ambienti avanzati sono demandati all’hosting.

3. Ruoli e accesso
Cameriere

Apertura tavoli

Inserimento ordini

Invio comande

Nessun accesso a report o configurazioni

Admin

Controllo totale del sistema

Accesso a dashboard e report

Visualizzazione log ed errori

Configurazioni generali

Autenticazione

Username + PIN

Accesso rapido

Timeout di sessione

Blocco automatico dell’interfaccia dopo inattività

4. Tavoli

I tavoli sono identificati solo da un numero.

All’apertura di un tavolo è possibile inserire opzionalmente un nominativo, visibile nella lista tavoli.

Accesso concorrente ai tavoli (vincolo critico)

Un tavolo può essere aperto da un solo utente alla volta

Se un tavolo è già aperto (in qualsiasi stato ≠ libero), nessun altro utente può aprirlo o modificarlo contemporaneamente

Il blocco deve essere gestito lato backend (lock applicativo), non solo lato frontend

Se un secondo utente tenta di aprire un tavolo già aperto, il sistema deve:

impedire l’accesso

mostrare un messaggio chiaro (es. "Tavolo attualmente in uso")

Stati del tavolo

Libero

In attesa (ordine in composizione, nessuna comanda inviata)

Occupato (almeno una comanda inviata)

I tavoli in stato in attesa devono essere recuperabili anche dopo refresh o crash.

5. Ordini e comande
Ordine

Associato a un solo tavolo

Creato all’apertura del tavolo

Contiene:

numero tavolo

nominativo (opzionale)

numero coperti

prezzo coperti

elenco delle comande

Viene chiuso solo con l’azione “Libera tavolo”

Comanda

Associata a un solo ordine

Contiene:

prodotti

timestamp

stato di stampa

Ogni invio genera una nuova comanda

Numerazione interna all’ordine (non globale)

Uno stesso ordine può avere N comande.

6. Coperti

La selezione dei coperti è obbligatoria all’apertura del tavolo

I coperti hanno un prezzo

I coperti sono associati all’ordine

I coperti compaiono nel preconto

7. Prodotti

Il database contiene già:

categorie

prodotti

gusti

supplementi

Non sono gestiti:

magazzino

ingredienti

allergeni

Stato prodotto

Un prodotto può essere attivato/disattivato

Un prodotto disattivato:

NON è selezionabile

rimane visibile nello storico ordini

Interfaccia prodotto

Per ogni prodotto devono essere gestibili:

Quantità (intero ≥ 1)

Gusti (multi-selezione)

Supplementi (multi-selezione)

Note libere

Le immagini di prodotti, gusti e supplementi sono solo a scopo UI e non influenzano la logica di business.

8. Flussi operativi
Tavolo LIBERO

Selezione coperti (obbligatoria)

Accesso ai prodotti

Pulsante “Indietro” per tornare alla lista tavoli

Invio comanda consentito solo se è presente almeno un prodotto

Tavolo IN ATTESA

Aggiunta di ulteriori prodotti

Pulsanti:

“Invia comanda”

“Annulla comanda” (svuota l’ordine e libera il tavolo)

Tavolo OCCUPATO – senza nuovi prodotti

Pulsanti:

“Indietro”

“Libera tavolo”

Tavolo OCCUPATO – con nuovi prodotti aggiunti

Stato visivo: occupato ma in attesa

Pulsanti:

“Indietro”

“Invia comanda” (stampa solo i nuovi prodotti)

“Libera tavolo”

Se si tenta di liberare il tavolo con prodotti non inviati:

“Alcuni prodotti non sono stati ancora inviati. Sei sicuro di voler liberare questo tavolo?”

9. Chiusura tavolo e preconto

La chiusura del tavolo richiede conferma obbligatoria:

“Sei sicuro di voler liberare il tavolo e stampare il preconto?”

La chiusura:

stampa il preconto

chiude definitivamente l’ordine

Il preconto deve mostrare:

elenco prodotti

coperti (con prezzo)

note

10. Stampa

Stampante termica Wi-Fi

Formato 80mm

Ogni:

Comanda inviata → stampa immediata

Chiusura ordine → stampa preconto

Stato stampa

PENDING_PRINT

PRINTED

PRINT_FAILED

In caso di errore:

log persistente

notifica visibile all’admin

11. Dashboard e report (Admin)

Dashboard generale

Storico ordini

Accesso ai dettagli ordine con comande

Report:

Giornalieri

Settimanali

Mensili

Aggregazioni:

per prodotto

per categoria

Visualizzazione:

grafici

Esportazione:

CSV

PDF

12. Regole critiche

Il sistema deve essere leggero e reattivo

Tutto deve funzionare in real-time

Il backend governa stato e coerenza

Il frontend non deve gestire logiche critiche

Gli errori gravi devono essere notificati

13. Decisioni architetturali consolidate

Le seguenti decisioni derivano dall’analisi del progetto precedente e sono vincolanti.

Decisioni confermate

Separazione netta tra Tavolo, Ordine e Comanda

Il Tavolo non contiene logica di business storica, ma solo stato operativo

L’Ordine è l’unità di storico principale

Una Comanda appartiene a un solo Ordine

Un Ordine può avere N Comande

La chiusura dell’ordine avviene solo tramite “Libera tavolo”

La liberazione del tavolo:

stampa il preconto

termina l’ordine

rende il tavolo nuovamente libero

Non esiste uno stato “ordine chiuso”: ordine terminato = ordine storicizzato

Stampa

Ogni Comanda genera una stampa

La stampa ha stato persistente:

PENDING_PRINT

PRINTED

PRINT_FAILED

In caso di PRINT_FAILED:

log persistente

notifica admin

Real-time e recupero stato

Il sistema deve funzionare in real-time tra tutti i dispositivi

Tutti gli eventi critici devono essere propagati

Tavoli in attesa e ordini attivi devono essere recuperabili dopo crash o refresh

Logging

Devono essere loggate almeno le seguenti operazioni:

apertura tavolo

invio comanda

errore di stampa

liberazione tavolo

14. Metodo di lavoro (vincolante)

Questo file è la fonte assoluta di verità del progetto.

Il README deve essere aggiornato a fine modulo o feature, non a ogni singola azione.

Il file deve contenere:

lavoro svolto

errori risolti (in sottocartella dedicata)

scelte architetturali adottate

alternative valutate e scartate

Claude Code deve:

verificare sempre la coerenza con questo file

fermarsi davanti a ambiguità o incongruenze

proporre eventuali correzioni prima di implementare

lavorare per moduli e feature complete

spiegare la logica implementata

testare ogni feature prima di considerarla completata

rifiutare richieste incoerenti con questo file