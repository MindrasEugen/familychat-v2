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

### Autenticazione
- [ ] Idea per il futuro, non richiesta ora: accesso con passkey (impronta/volto/PIN). Il pannello Supabase (Authentication → Passkeys) è lasciato spento di proposito: senza codice nell'app (registrazione e accesso con passkey) attivarlo non cambia nulla. Se si fa: nome visualizzato "Chat Famiglia" (nel pannello compare ancora "todo-list-app", avanzo di un vecchio progetto), Relying Party ID legato al dominio `familychat-v2.onrender.com` (cambiare dominio invalida le passkey esistenti; altre app sullo stesso progetto Supabase vanno aggiunte alle origini), da studiare insieme al multi-account sullo stesso dispositivo.
- [ ] Idea per il futuro, non richiesta ora: captcha (hCaptcha) su accesso/registrazione/recupero password. **Non attivarlo in Supabase (Authentication → Attack Protection) senza prima il codice nell'app**: con il captcha attivo Supabase rifiuta ogni richiesta senza `captchaToken`, bloccando tutti gli accessi. Rischio bot basso per una chat di famiglia, limiti di frequenza di Supabase già attivi.

### Chat
- [ ] Testare l'invio foto con un vero file HEIC (nessun campione disponibile finora — verificato solo il percorso PNG/JPEG via `createImageBitmap`, vedi `NOTE.md`, 2026-09-07).

### Traduzione (Edge Function)
- [ ] Livello Azure configurato (regione `northeurope`) ma mai esercitato davvero: entra in gioco solo se Google fallisce. Verificarlo forzando un fallimento di Google (es. in un ambiente di prova) prima di contarci.
- [ ] **Azione dell'utente, al momento dell'upgrade**: Google Cloud è in free trial, dove le quote non sono modificabili. Quando si passa all'account a pagamento, impostare subito "Characters per day" (~15.000) nelle quote di Cloud Translation API, prima di qualunque addebito (vedi `supabase/functions/.env.example`).
- [ ] **Concordato con l'utente, da fare più avanti**: glossario di nomi/soprannomi di famiglia da NON tradurre (marcati come non traducibili nelle richieste a Google/Azure). Scartati invece il glossario di sostituzioni cieche (ambiguo, es. "bomba → awesome") e le correzioni passate come esempi a un LLM (costo/prevedibilità) — vedi `NOTE.md`, 2026-09-25.
- [ ] Verificare in chat che i messaggi di sole emoji/punteggiatura restino senza "Tradotto" né "Correggi traduzione" (correzione del 2026-09-25). Le vecchie voci Mistral in memoria con frasi miste (testo + emoji) potrebbero avere l'emoji alterata: si sistemano con "Correggi" se capita di vederle.
- [ ] Idea in attesa, non richiesta: passare la lingua di partenza invece dell'auto-rilevamento (messaggi corti rilevati male: `la`, `de`, `it` su testi probabilmente rumeni). L'utente preferisce osservare prima.

### Grafica
- [ ] Provare su un telefono vero: barra in basso e barra di scrittura con le safe area (notch/gesture bar), app installata (PWA) con il colore di sistema del tema.

### Foto in chat
- [ ] Su telefono vero: pulsante fotocamera (soprattutto **Brave su Android**, il caso che lo ha motivato) e "Scarica" dalla vista a schermo intero, anche nell'app installata (PWA) e su iPhone.

### Tutorial di benvenuto
- [ ] Far rileggere i testi in rumeno e francese a chi parla la lingua (`src/features/tutorial/tutorialTexts.ts`) — scritti da Claude, non ancora rivisti da un madrelingua.

### Notifiche push
- [ ] Ricezione reale confermata dall'utente il 2026-09-25 (vedi `NOTE.md`). Restano da provare: nessuna notifica con "Notifiche di questa camera" spento; due account sullo stesso telefono nella stessa camera → una sola notifica; soppressione quando la camera è già aperta; comportamento del click sulla notifica.
- [ ] Controllare l'avviso a tempo (8 s) e i testi specifici su iPhone non installato, permesso bloccato e Brave.

### Non letti
- [ ] Verificare con due persone: pallino con il numero sulla camera e sulla voce "Camere" della barra in basso, aggiornamento in tempo reale senza ricaricare, azzeramento all'apertura della camera, "letto" condiviso tra PC e telefono dello stesso account.

### Dismissione v1 (decisa il 2026-09-26)
- [ ] Tra qualche settimana: decidere se cancellare i dati della v1 (`public.messages`, `public.push_subscriptions`, `public.todos`, bucket `chat-photos`), con backup prima se serve. NON toccare `translate-message`, `send-push` né le chiavi VAPID: sono della v2.

### Verifiche sulla v2 in uso (erano i criteri per sostituire la v1)
- [ ] Lezione 9: nessuna notifica residua a chat già aperta, incluso il primo caricamento a freddo.

## Note di processo
- Le decisioni architetturali (modello camere, traduzione, memoria traduzioni, librerie, backend/hosting) sono già prese in `PROMPT_REACT_REWRITE.md` — non richiedono un altro giro di analisi.
- Task ben specificati su singoli pezzi (un componente, una query, uno stile) sono delegabili ai worker configurati, secondo le regole di delega globali dell'utente. Le decisioni architetturali sopra elencate (schema DB, ruoli, catena di fallback traduzione) restano non delegabili in blocco — vanno prese/guidate direttamente, l'implementazione dei pezzi conseguenti sì.
- **pnpm e `C:\Users\mandr`**: nella cartella utente esistono `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` di un vecchio esercizio Prisma, che pnpm 11 tratta come workspace padre. Effetti osservati il 2026-09-25: `pnpm add` aggiorna il lockfile sbagliato (quello del progetto resta indietro e la build Render con `--frozen-lockfile` fallirebbe), e `pnpm test`/`pnpm lint` si bloccano sul controllo dipendenze. Finché quei file restano lì: installare con `pnpm install --ignore-workspace` (o `pnpm add ... --ignore-workspace`), lanciare test/lint con `npx vitest run` / `npx oxlint`, e controllare sempre che `pnpm-lock.yaml` del progetto sia cambiato.
- Prima di introdurre qualunque libreria/servizio esterno nuovo, verificare se il backend Supabase esistente offre già una capacità equivalente; se si decide di non riusarla, fermarsi e chiedere (vedi regola globale, osservata su un caso reale in v1: traduzione instradata verso un servizio pubblico esterno pur avendo trovato ed escluso la Edge Function già esistente).
