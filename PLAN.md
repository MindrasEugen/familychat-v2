# PLAN — familychat-v2

Tracker vivo dello stato di avanzamento della riscrittura React. Aggiornare
questo file ad ogni giro di lavoro (non solo leggerlo) — segnare cosa è
stato completato e spostare le voci da "Da fare" a "Fatto" quando finite.
Le decisioni architetturali di fondo sono in `PROMPT_REACT_REWRITE.md`
(documento di partenza, non riassumerlo qui — questo file traccia solo lo
stato, non ripete le motivazioni).

## Fatto

### 2026-09-05 — Scaffold iniziale
- Progetto Vite + React 19 + TypeScript creato (`pnpm create vite --template react-ts`).
- Dipendenze installate: `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`, `zustand`.
- Dipendenze test: `vitest`, `@testing-library/react` + `jest-dom`, `jsdom`, `@playwright/test`.
- Struttura cartelle per responsabilità: `src/features/{auth,rooms,chat,translator,notifications}`, `src/lib/{supabaseClient,queryClient}`.
- Routing base con React Router: `/login`, `/rooms`, `/rooms/:roomId`, `/translator` — tutte pagine placeholder, nessuna logica reale.
- `src/lib/supabaseClient.ts` collegato al progetto Supabase esistente (`qamvkevkddfwyxhbftoy`, stesso backend della v1) via `.env.local` (non committato); `.env.example` con placeholder committato.
- Smoke test Vitest + RTL (`src/App.test.tsx`) e config Playwright + test e2e placeholder (`tests/e2e/smoke.spec.ts`) — Playwright scritto ma browser non ancora installati (vedi "Da fare").
- `PROMPT_REACT_REWRITE.md` = copia integrale del documento di decisioni (`familychat-v2-react-prompt3.md`).
- Repo git inizializzato con commit iniziale.

## Da fare

Ripreso da `PROMPT_REACT_REWRITE.md` — non ancora iniziato, nessuna riga di logica reale scritta oltre ai placeholder.

### Setup/manuale
- [ ] `pnpm exec playwright install` (non eseguito nello scaffold per evitare un download pesante non richiesto) prima di poter lanciare `pnpm test:e2e`.
- [ ] Decidere se serve ancora la PWA (service worker, manifest, `vite-plugin-pwa`) con l'architettura nuova — non dare per scontato solo perché la v1 la aveva.

### Modello dati Supabase (nuovo, da progettare e migrare sul progetto esistente)
- [ ] Tabella profili utente (username, foto profilo) legata a un account Supabase individuale — sostituisce l'identificazione per nome-device della v1.
- [ ] Camere con invito (non più credenziali condivise): creazione camera, inviti, membership.
- [ ] Due ruoli: fondatore (controllo pieno: cancella messaggi altrui, gestisce membri, presumibilmente elimina la camera) e membro (cancella solo i propri messaggi, può invitare terzi). Da chiarire in fase di implementazione: camera orfana se il fondatore se ne va/elimina l'account; revoca di un invito non ancora accettato; limite di inviti per membro.
- [ ] Retention automatica messaggi (30 giorni, come v1).
- [ ] Tabella `translation_memory` (testo originale, lingua sorgente/destinazione, traduzione, servizio usato, timestamp, `corrected_by_user`) — confronto per corrispondenza esatta normalizzata (case/spazi), mai fuzzy; le entry `corrected_by_user: true` non vanno mai sovrascritte da una chiamata API; non salvare mai una traduzione tornata identica all'originale con lingue diverse.

### Autenticazione
- [ ] Login/registrazione reali con `@supabase/supabase-js` (sostituire il placeholder in `src/features/auth`).
- [ ] Più account/camere collegati sullo stesso dispositivo contemporaneamente.
- [ ] Gestione esplicita dei casi limite di sessione/realtime: telefono in background a lungo, rete che cade e torna, riapertura da notifica push (lezione 2) — verificare/ricreare un canale realtime solo se non è più vivo, non ad ogni evento di foreground (lezione 10, seconda parte).

### Chat
- [ ] Cronologia messaggi con TanStack Query: merge per id + ordinamento per timestamp, mai svuotare e ripopolare la lista mentre una sottoscrizione realtime è attiva sulla stessa camera (lezione 10).
- [ ] Invio testo e foto, con la stessa cascata di decodifica HEIC della v1 (`createImageBitmap` → `<img>` → `heic2any` con timeout) e un fallback esplicito se la decodifica fallisce (lezione 5).
- [ ] Traduzione automatica inline nella lingua di chi legge.
- [ ] Correzione traduzione dalla chat (tocco lungo → "Correggi traduzione") che aggiorna `translation_memory`.

### Traduzione (Edge Function)
- [ ] Edge Function `translate-message` estesa (non ripartire da zero) per gestire la catena: Google Cloud Translation (primario, senza billing abilitato per restare sul piano gratuito) → secondo servizio gratuito da individuare al momento dell'implementazione (DeepL da verificare) → Mistral esistente come rete di sicurezza finale.
- [ ] Cache/lookup su `translation_memory` prima di chiamare qualunque servizio.
- [ ] Traduttore standalone: decidere consapevolmente se ampliare oltre francese/inglese (limite esplicito, non un bug, della v1) ora che il servizio copre 130+ lingue.

### Notifiche push
- [ ] Registrazione service worker + Web Push (VAPID), pacchetto `web-push` lato Edge Function.
- [ ] Chiusura notifiche affidabile con `navigator.serviceWorker.ready` (mai `.controller`), sia al ritorno in foreground sia al primo caricamento a freddo (lezioni 3 e 9).
- [ ] Esclusione del mittente lato server in `send-push` per endpoint/sottoscrizione, non solo per `user_id` (lezione 8) — la soppressione client-side resta un secondo livello, non l'unico.

### Criteri di accettazione prima di sostituire la v1 in produzione
- [ ] Lezione 8 verificata (mittente mai notificato del proprio messaggio, a livello server).
- [ ] Lezione 9 verificata (nessuna notifica residua a chat già aperta, incluso il primo caricamento a freddo).
- [ ] Lezione 10 verificata (nessun messaggio perso/fuori ordine con più utenti concorrenti e una sottoscrizione realtime attiva).

### Note di processo
- Le decisioni architetturali (modello camere, traduzione, memoria traduzioni, librerie, backend/hosting) sono già prese in `PROMPT_REACT_REWRITE.md` — non richiedono un altro giro di analisi.
- Task ben specificati su singoli pezzi (un componente, una query, uno stile) sono delegabili ai worker configurati, secondo le regole di delega globali dell'utente. Le decisioni architetturali sopra elencate (schema DB, ruoli, catena di fallback traduzione) restano non delegabili in blocco — vanno prese/guidate direttamente, l'implementazione dei pezzi conseguenti sì.
- Prima di introdurre qualunque libreria/servizio esterno nuovo, verificare se il backend Supabase esistente offre già una capacità equivalente; se si decide di non riusarla, fermarsi e chiedere (vedi regola globale, osservata su un caso reale in v1: traduzione instradata verso un servizio pubblico esterno pur avendo trovato ed escluso la Edge Function già esistente).
