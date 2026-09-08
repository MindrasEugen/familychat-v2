# PLAN — familychat-v2

Tracker vivo dello stato di avanzamento della riscrittura React. Aggiornare
questo file ad ogni giro di lavoro (non solo leggerlo) — segnare cosa è
stato completato e spostarlo in `NOTE.md` (non lasciarlo qui spuntato).
Le decisioni architetturali di fondo sono in `PROMPT_REACT_REWRITE.md`
(documento di partenza, non riassumerlo qui — questo file traccia solo lo
stato aperto). Il lavoro già concluso e verificato, con tutto il dettaglio
storico (bug trovati, verifiche end-to-end, tentativi di delega falliti), è
in `NOTE.md` — consultarlo per il "perché" dietro una scelta già presa.

## Da fare

### Setup/manuale
- [ ] `pnpm exec playwright install` (non eseguito nello scaffold per evitare un download pesante non richiesto) prima di poter lanciare `pnpm test:e2e`.
- [ ] Decidere se serve ancora la PWA (service worker, manifest, `vite-plugin-pwa`) con l'architettura nuova — non dare per scontato solo perché la v1 la aveva.

### Modello dati Supabase — rifinitura
- [ ] Non ancora imposto un limite al numero di inviti che un membro può creare (`AAA3_room_invites`) — il documento lo lascia aperto; da decidere se/come applicarlo.

### Autenticazione
- [ ] Più account/camere collegati sullo stesso dispositivo contemporaneamente — richiede istanze client Supabase separate (storageKey distinti) o meccanismo equivalente; da progettare come decisione a sé, non ancora affrontata.
- [ ] **Azione richiesta all'utente**: aggiungere `http://localhost:5173/reset-password` (e l'equivalente dominio di produzione, quando esisterà) alle Redirect URLs del progetto Supabase (`qamvkevkddfwyxhbftoy`) da Dashboard → Authentication → URL Configuration — senza questo, il recupero password resta bloccato in pratica anche se il codice è già implementato e verificato (vedi `NOTE.md`, 2026-09-07). Nessuno strumento disponibile da qui può impostarlo al posto dell'utente.

### Chat
- [ ] Testare l'invio foto con un vero file HEIC (nessun campione disponibile finora — verificato solo il percorso PNG/JPEG via `createImageBitmap`, vedi `NOTE.md`, 2026-09-07).

### Traduzione (Edge Function)
- [ ] **Azione richiesta all'utente**: procurarsi le chiavi `GOOGLE_TRANSLATE_API_KEY` e/o `AZURE_TRANSLATOR_KEY` (vedi `supabase/functions/.env.example` per le istruzioni) — senza di esse la traduzione funziona già ma passa sempre da Mistral (unico livello oggi configurato).
- [ ] Traduzione automatica in chat non ancora testata con Google/Azure attivi (nessuna chiave disponibile finora) — solo il fallback Mistral è stato verificato end-to-end.

### Notifiche push
- [ ] **Verifica con un vero permesso di notifica** (browser non automatizzato): ricezione reale di una push, soppressione quando la camera è già aperta, comportamento del click sulla notifica.

### Criteri di accettazione prima di sostituire la v1 in produzione
- [ ] Lezione 8 verificata (mittente mai notificato del proprio messaggio, a livello server).
- [ ] Lezione 9 verificata (nessuna notifica residua a chat già aperta, incluso il primo caricamento a freddo).
- [ ] Lezione 10 verificata (nessun messaggio perso/fuori ordine con più utenti concorrenti e una sottoscrizione realtime attiva).

## Note di processo
- Le decisioni architetturali (modello camere, traduzione, memoria traduzioni, librerie, backend/hosting) sono già prese in `PROMPT_REACT_REWRITE.md` — non richiedono un altro giro di analisi.
- Task ben specificati su singoli pezzi (un componente, una query, uno stile) sono delegabili ai worker configurati, secondo le regole di delega globali dell'utente. Le decisioni architetturali sopra elencate (schema DB, ruoli, catena di fallback traduzione) restano non delegabili in blocco — vanno prese/guidate direttamente, l'implementazione dei pezzi conseguenti sì.
- Prima di introdurre qualunque libreria/servizio esterno nuovo, verificare se il backend Supabase esistente offre già una capacità equivalente; se si decide di non riusarla, fermarsi e chiedere (vedi regola globale, osservata su un caso reale in v1: traduzione instradata verso un servizio pubblico esterno pur avendo trovato ed escluso la Edge Function già esistente).
