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

### Chat
- [ ] Testare l'invio foto con un vero file HEIC (nessun campione disponibile finora — verificato solo il percorso PNG/JPEG via `createImageBitmap`, vedi `NOTE.md`, 2026-09-07).

### Traduzione (Edge Function)
- [ ] Livello Azure configurato (regione `northeurope`) ma mai esercitato davvero: entra in gioco solo se Google fallisce. Verificarlo forzando un fallimento di Google (es. in un ambiente di prova) prima di contarci.
- [ ] **Azione dell'utente, al momento dell'upgrade**: Google Cloud è in free trial, dove le quote non sono modificabili. Quando si passa all'account a pagamento, impostare subito "Characters per day" (~15.000) nelle quote di Cloud Translation API, prima di qualunque addebito (vedi `supabase/functions/.env.example`).
- [ ] **Concordato con l'utente, da fare più avanti**: glossario di nomi/soprannomi di famiglia da NON tradurre (marcati come non traducibili nelle richieste a Google/Azure). Scartati invece il glossario di sostituzioni cieche (ambiguo, es. "bomba → awesome") e le correzioni passate come esempi a un LLM (costo/prevedibilità) — vedi `NOTE.md`, 2026-09-25.
- [ ] Verificare in chat che i messaggi di sole emoji/punteggiatura restino senza "Tradotto" né "Correggi traduzione" (correzione del 2026-09-25). Le vecchie voci Mistral in memoria con frasi miste (testo + emoji) potrebbero avere l'emoji alterata: si sistemano con "Correggi" se capita di vederle.
- [ ] Idea in attesa, non richiesta: passare la lingua di partenza invece dell'auto-rilevamento (messaggi corti rilevati male: `la`, `de`, `it` su testi probabilmente rumeni). L'utente preferisce osservare prima.

### Grafica
- [ ] **Verificare in browser** le schermate dopo l'accesso (lista camere, chat, Info camera, traduttore, Account, vista foto a schermo intero, tutorial via "Rivedi la guida") in formato telefono e desktop, in entrambi i temi — il 2026-09-25 è stata vista solo la pagina di accesso (l'accesso con password va fatto dall'utente).
- [ ] Provare su un telefono vero: barra in basso e barra di scrittura con le safe area (notch/gesture bar), app installata (PWA) con il colore di sistema del tema.

### Foto in chat
- [ ] Su telefono vero: pulsante fotocamera (soprattutto **Brave su Android**, il caso che lo ha motivato) e "Scarica" dalla vista a schermo intero, anche nell'app installata (PWA) e su iPhone.

### Tutorial di benvenuto
- [ ] Far rileggere i testi in rumeno e francese a chi parla la lingua (`src/features/tutorial/tutorialTexts.ts`) — scritti da Claude, non ancora rivisti da un madrelingua.
- [ ] Verificare il primo avvio reale con un profilo appena creato: il tutorial compare una volta, "Salta"/"Inizia"/Esc lo segnano come visto (`tutorial_seen_at` valorizzato) e non ricompare dopo un reload.

### Notifiche push
- [ ] Ricezione reale confermata dall'utente il 2026-09-25 (vedi `NOTE.md`). Restano da provare: nessuna notifica con "Notifiche di questa camera" spento; due account sullo stesso telefono nella stessa camera → una sola notifica; soppressione quando la camera è già aperta; comportamento del click sulla notifica.
- [ ] Controllare l'avviso a tempo (8 s) e i testi specifici su iPhone non installato, permesso bloccato e Brave.

### Non letti
- [ ] Verificare con due persone: pallino con il numero sulla camera e sulla voce "Camere" della barra in basso, aggiornamento in tempo reale senza ricaricare, azzeramento all'apertura della camera, "letto" condiviso tra PC e telefono dello stesso account.

### Dismissione v1 (decisa il 2026-09-26)
- [ ] **Azione dell'utente**: sospendere su Render il sito `chat-famiglia` (Dashboard → chat-famiglia → Settings → Suspend). Gli strumenti disponibili da qui non permettono di sospendere un servizio. Sospendere, non cancellare, finché la v2 non ha girato qualche settimana da sola.
- [ ] Tra qualche settimana: decidere se cancellare i dati della v1 (`public.messages`, `public.push_subscriptions`, `public.todos`, bucket `chat-photos`), con backup prima se serve. NON toccare `translate-message`, `send-push` né le chiavi VAPID: sono della v2.
- [ ] **Azione dell'utente** (consigliata): attivare la protezione contro le password compromesse (Dashboard Supabase → Authentication → Password security).

### Verifiche sulla v2 in uso (erano i criteri per sostituire la v1)
- [ ] Lezione 8: mittente mai notificato del proprio messaggio, a livello server.
- [ ] Lezione 9: nessuna notifica residua a chat già aperta, incluso il primo caricamento a freddo.
- [ ] Lezione 10: nessun messaggio perso/fuori ordine con più utenti concorrenti e una sottoscrizione realtime attiva.

## Note di processo
- Le decisioni architetturali (modello camere, traduzione, memoria traduzioni, librerie, backend/hosting) sono già prese in `PROMPT_REACT_REWRITE.md` — non richiedono un altro giro di analisi.
- Task ben specificati su singoli pezzi (un componente, una query, uno stile) sono delegabili ai worker configurati, secondo le regole di delega globali dell'utente. Le decisioni architetturali sopra elencate (schema DB, ruoli, catena di fallback traduzione) restano non delegabili in blocco — vanno prese/guidate direttamente, l'implementazione dei pezzi conseguenti sì.
- **pnpm e `C:\Users\mandr`**: nella cartella utente esistono `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` di un vecchio esercizio Prisma, che pnpm 11 tratta come workspace padre. Effetti osservati il 2026-09-25: `pnpm add` aggiorna il lockfile sbagliato (quello del progetto resta indietro e la build Render con `--frozen-lockfile` fallirebbe), e `pnpm test`/`pnpm lint` si bloccano sul controllo dipendenze. Finché quei file restano lì: installare con `pnpm install --ignore-workspace` (o `pnpm add ... --ignore-workspace`), lanciare test/lint con `npx vitest run` / `npx oxlint`, e controllare sempre che `pnpm-lock.yaml` del progetto sia cambiato.
- Prima di introdurre qualunque libreria/servizio esterno nuovo, verificare se il backend Supabase esistente offre già una capacità equivalente; se si decide di non riusarla, fermarsi e chiedere (vedi regola globale, osservata su un caso reale in v1: traduzione instradata verso un servizio pubblico esterno pur avendo trovato ed escluso la Edge Function già esistente).
