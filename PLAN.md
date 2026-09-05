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

### 2026-09-05 — Schema Supabase v2 (bozza, non ancora applicata)
- Migrazione `supabase/migrations/20260905083821_init_v2_schema.sql` (via `supabase init` + `supabase migration new`) con lo schema completo: `AAA3_profiles`, `AAA3_rooms`, `AAA3_room_members`, `AAA3_room_invites`, `AAA3_chat_messages`, `AAA3_translation_memory` — prefisso `AAA3_` su richiesta esplicita dell'utente. RLS su tutte le tabelle; iscrizione a una camera solo tramite le funzioni `create_room`/`accept_room_invite` (security definer), mai insert diretto su `AAA3_room_members`; ruoli fondatore/membro come da documento; retention 30gg via `pg_cron`; bucket storage `room-photos` (distinto da `chat-photos` di v1) con policy per membership; vincolo `AAA3_translation_memory_no_silent_noop` che impedisce a livello DB di salvare una traduzione identica all'originale tra lingue diverse (lezione 4); trigger che protegge le entry `corrected_by_user = true` da sovrascritture automatiche.
- Verificato che nessun nome collide con le tabelle esistenti della v1 nello stesso progetto Supabase (`public.messages`, `public.push_subscriptions`, `public.todos`, bucket `chat-photos` — vedi `FamilyChat/DB.sql`).
- **Applicata al progetto Supabase reale** (`qamvkevkddfwyxhbftoy`) il 2026-09-05, con conferma esplicita dell'utente. Non tramite `supabase db push` (il progetto ha una cronologia migrazioni CLI di 12 voci non presenti in questo repo — v1 usa un proprio tracking separato — forzare un allineamento avrebbe rischiato di corrompere quella cronologia) ma tramite `supabase db query --linked -f supabase/migrations/20260905083821_init_v2_schema.sql`, che esegue lo script senza toccare la tabella di bookkeeping `supabase_migrations.schema_migrations` di v1. Verificato dopo l'esecuzione: tutte e 6 le tabelle `AAA3_*` esistono, il bucket `room-photos` esiste, le tabelle/bucket della v1 (`messages`, `push_subscriptions`, `todos`, `chat-photos`) restano intatti. Non validata prima contro un'istanza Postgres locale (Docker non disponibile su questa macchina per `supabase db start`) — solo revisione manuale riga per riga più verifica post-applicazione.
- **Nota per i prossimi giri**: questo repo non è collegato alla cronologia migrazioni CLI del progetto (12 migrazioni remote di v1/altre app non hanno un file locale corrispondente qui). Continuare ad applicare le prossime migrazioni v2 con `supabase db query --linked -f <file>`, non con `supabase db push`/`migration repair`, per non toccare il tracking di v1.

### 2026-09-05 — Autenticazione reale (login, registrazione, profilo)
- `AAA3_profiles` collegata via `src/lib/database.types.ts` (tipi generati da `supabase gen types typescript --linked`, non scritti a mano).
- Sessione tenuta in uno store Zustand (`src/features/auth/sessionStore.ts`) sincronizzato con `supabase.auth.onAuthStateChange`; profilo caricato/aggiornato via TanStack Query (`useProfile`/`useCompleteProfile` in `useProfile.ts`).
- Flusso: `LoginPage` (email+password, sign in/sign up) → dopo la registrazione l'utente viene sempre instradato su `CompleteProfilePage` per scegliere lo username (mai chiesto nel form di signup stesso — vedi bug sotto) → `RequireAuth`/`GuestOnly`/`RequireSessionNoProfile` (`routeGuards.tsx`, tutte derivate da un unico `useAuthStatus`) instradano automaticamente in base allo stato reale (nessuna sessione / sessione senza profilo / autenticato).
- **Bug trovato e corretto durante il test in browser**: il primo tentativo chiedeva lo username direttamente nel form di registrazione e provava a inserire subito la riga in `AAA3_profiles` dentro `handleSignUp`. L'insert perdeva sistematicamente una race condition con il redirect automatico del router (che scatta non appena l'evento `SIGNED_IN` arriva al resto dell'app, ancora prima che l'insert locale completasse) e non veniva mai eseguito — verificato riproducendo la sequenza via chiamate dirette a Auth/REST API, dove l'insert isolato funziona correttamente (RLS/schema OK, il problema era solo la race lato client). Risolto rimuovendo il campo username dal signup e affidando SEMPRE la creazione del profilo a `CompleteProfilePage`, che si attiva in modo affidabile tramite la guardia di route invece che tramite un side-effect nello stesso gestore dell'evento.
- **Verificato end-to-end in browser reale** (Chrome via claude-in-chrome) con un account di test: registrazione → completa profilo → `/rooms` con nav corretta (username + Esci) → logout → nuovo login → `/rooms` senza richiedere di nuovo il profilo. Account di test ripuliti dal DB dopo la verifica (cascade su `AAA3_profiles` confermato funzionante).
- **Non ancora implementato**: "più account/gruppi collegati sullo stesso dispositivo contemporaneamente" (funzionalità richiesta nel documento) — il client Supabase attuale gestisce una sola sessione attiva per origine/browser. Supportare più profili loggati insieme richiede istanze client separate con `storageKey` distinti (o un meccanismo equivalente); non progettato in questo giro, va trattato come una decisione architetturale a parte prima di essere implementato.

## Da fare

Ripreso da `PROMPT_REACT_REWRITE.md` — nessuna riga di logica applicativa reale scritta oltre ai placeholder (lo schema DB è progettato ma non applicato, vedi sopra).

### Setup/manuale
- [ ] `pnpm exec playwright install` (non eseguito nello scaffold per evitare un download pesante non richiesto) prima di poter lanciare `pnpm test:e2e`.
- [ ] Decidere se serve ancora la PWA (service worker, manifest, `vite-plugin-pwa`) con l'architettura nuova — non dare per scontato solo perché la v1 la aveva.

### Modello dati Supabase — rifinitura dopo l'applicazione
- [ ] Verificare `create_room`/`accept_room_invite`/`revoke_room_invite` con dati reali (RLS, security definer) una volta applicata la migrazione.
- [ ] Non ancora imposto un limite al numero di inviti che un membro può creare (`AAA3_room_invites`) — il documento lo lascia aperto; da decidere se/come applicarlo.
- [ ] Job di pulizia per i file orfani nel bucket `room-photos` oltre i 30 giorni (gap noto: il job `pg_cron` di retention cancella solo le righe di `AAA3_chat_messages`, non i file storage — serve una Edge Function schedulata con service role, vedi commento nella migrazione).

### Autenticazione
- [x] Login/registrazione reali con `@supabase/supabase-js` — vedi "Fatto" sopra (2026-09-05).
- [ ] Più account/camere collegati sullo stesso dispositivo contemporaneamente — richiede istanze client Supabase separate (storageKey distinti) o meccanismo equivalente; da progettare come decisione a sé, non ancora affrontata.
- [ ] Gestione esplicita dei casi limite di sessione/realtime: telefono in background a lungo, rete che cade e torna, riapertura da notifica push (lezione 2) — verificare/ricreare un canale realtime solo se non è più vivo, non ad ogni evento di foreground (lezione 10, seconda parte).
- [ ] Recupero password ("password dimenticata") — non ancora implementato, non menzionato esplicitamente nel documento ma probabilmente necessario.
- [ ] Upload foto profilo (colonna `avatar_url` già pronta in `AAA3_profiles`, ma manca un bucket storage dedicato e l'UI di upload — non incluso in questo giro, solo lo username).

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
