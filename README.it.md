[English](README.md) | Italiano

# FamilyChat

Una chat di famiglia in cui ognuno scrive nella sua lingua e legge nella propria: i messaggi vengono tradotti in automatico nella lingua del telefono di chi legge. Pensata per una famiglia sparsa tra più paesi (italiano, rumeno e altre lingue).

<!-- TODO: aggiungere qui uno screenshot o una GIF dell'app. -->
<!-- TODO: aggiungere qui il link "Prova la demo". -->

## Funzionalità

- **Camere e inviti.** Le chat sono divise in camere. I membri invitano con un codice monouso, che chi entra scrive in «Unisciti».
- **Chat in tempo reale con foto.** Testo e fino a 10 foto per messaggio, compresse sul dispositivo (anche HEIC da iPhone). Vista a schermo intero con download. Contatore dei non letti per camera.
- **Traduzione automatica.** Ogni messaggio compare nella lingua di chi legge, con l'etichetta «Tradotto». Chiunque può correggere una traduzione con «Correggi»: la correzione vale per tutta la famiglia. Una pagina «Traduttore» a parte traduce testo libero.
- **Notifiche push.** Web Push per i nuovi messaggi, silenziabili camera per camera.
- **Tour guidato e demo, senza account.** Un tour passo passo al primo avvio e una demo libera («Prova la demo»), entrambi su dati d'esempio tenuti in memoria.
- **PWA installabile.** Un pulsante di installazione (Chrome, Edge, Samsung Internet), istruzioni su iPhone e una barretta che propone di ricaricare quando esce una nuova versione.
- **Due account sullo stesso dispositivo**, tema chiaro e scuro.
- **Lingue.** L'interfaccia è in italiano. Guida di benvenuto, tour, demo e avvisi di installazione e aggiornamento sono in italiano, rumeno, inglese e francese.
- **Conservazione.** I messaggi più vecchi di 30 giorni vengono cancellati in automatico, insieme alle loro foto.

## Stack e scelte tecniche

- **React 19 + TypeScript + Vite.** Un'app solo lato client, senza un server proprio.
- **React Router 7.** URL reali (`/rooms/<id>`): il service worker li legge per non notificare una camera già aperta.
- **TanStack React Query.** Dati del server e cache. Gli eventi realtime si uniscono alla cache per id, così un messaggio non compare mai due volte e non sparisce.
- **zustand.** Piccoli store lato client: sessione, account sul dispositivo, modalità tour/demo, richiesta di installazione.
- **Codice organizzato per funzionalità** (`src/features/*`): ogni funzionalità tiene insieme pagine, hook e testi.
- **Supabase.**
  - Auth: email e password, recupero password.
  - Postgres con Row Level Security su ogni tabella: ognuno vede solo le proprie camere.
  - Storage: bucket privato per le foto in chat (URL firmati), bucket pubblico per le foto profilo.
  - Realtime sui messaggi.
  - `pg_cron`: conservazione di 30 giorni e pulizia giornaliera delle foto orfane.
  - Edge Function: `translate-message`, `send-push`, `cleanup-orphan-photos`.
- **Traduzione (`translate-message`).**
  - Una catena di servizi: Azure → Google → Mistral. Se uno non risponde o non è configurato, subentra il successivo.
  - Una memoria delle traduzioni condivisa nel database: lo stesso testo non viene mai tradotto due volte, e le correzioni manuali hanno la precedenza.
  - Un contatore mensile dei caratteri tiene l'uso entro i limiti gratuiti; un servizio esaurito viene saltato fino al mese successivo.
- **Tour e demo in una sandbox lato client.** Ogni accesso ai dati passa da un'unica interfaccia (`DataApi`). Nel tour e nella demo viene sostituita da una versione in memoria con dati d'esempio, che mostra le stesse pagine: nessuna richiesta arriva al database né ad altri servizi. Finché la sandbox è aperta, il client Supabase vero lancia un errore se qualcosa prova a usarlo.
- **Ordine dei messaggi.** I messaggi sono ordinati per `created_at` con l'`id` come spareggio, nell'app e nel database. Il caricamento dei messaggi precedenti pagina sulla coppia (`created_at`, `id`), così due messaggi con lo stesso orario non vengono mai saltati né duplicati.
- **PWA.**
  - `manifest.json`.
  - Un service worker scritto a mano, usato solo per le notifiche push (nessuna cache offline).
  - Il pulsante di installazione.
  - Un controllo degli aggiornamenti: quando l'app torna in primo piano, al massimo ogni 10 minuti, confronta lo script principale dell'`index.html` pubblicato con quello in esecuzione.

## Avvio in locale

Prerequisiti:

- Node.js 22 (vedi `.node-version`)
- pnpm 11 (vedi `packageManager` in `package.json`)
- Docker Desktop, per lo stack Supabase locale (la CLI di Supabase si usa tramite `npx`)

Passaggi:

```bash
pnpm install

# Supabase locale: database, auth, storage, realtime, Edge Function.
# Applica tutte le migrazioni di supabase/migrations.
npx supabase start

# Variabili del frontend: copia il modello, poi inserisci l'URL API
# e la anon key locali mostrati da "npx supabase status".
cp .env.example .env.local

pnpm dev
```

L'app gira su http://localhost:5173.

La traduzione ha bisogno delle chiavi dei servizi in `supabase/functions/.env` (modello: `supabase/functions/.env.example`). Senza, il resto dell'app funziona; i messaggi restano semplicemente non tradotti.

`supabase/seed.sql` vale **solo per il database locale**. Il trigger delle notifiche e il job di pulizia delle foto puntano alle Edge Function online, quindi su un database locale il seed li spegne. Non va mai eseguito sul progetto online.

Per spegnere lo stack locale: `npx supabase stop`.

## Test

```bash
pnpm test              # test unitari e di componente (Vitest)
pnpm test:watch        # come sopra, in modalità watch
pnpm exec playwright install   # solo la prima volta: scarica i browser di test
pnpm test:e2e:local    # test end-to-end (Playwright) sullo stack Supabase locale
```

`pnpm test:e2e:local` crea tre account di prova (`@local.test`) e una camera sullo stack locale, poi ci lancia Playwright. Si ferma se Supabase non è locale, o se sulla porta 5173 c'è già un altro server acceso. `pnpm test:e2e` lancia gli stessi test sul progetto configurato in `.env.local`.

Cosa verificano i test, tra l'altro:

- nessuna richiesta arriva a Supabase durante tour e demo, dal caricamento della pagina fino alla registrazione vera;
- nessun messaggio si perde o esce fuori ordine con tre persone che scrivono insieme, o mentre il realtime si sta ancora collegando;
- i messaggi con lo stesso orario hanno lo stesso ordine nell'app e nel database, anche a cavallo di due pagine;
- i passi del tour, la sandbox e il client Supabase bloccato mentre la sandbox è aperta;
- il pulsante di installazione e le istruzioni per iPhone, mai visibili in tour e demo;
- ogni chiave di testo esiste in tutte e quattro le lingue.

Lint: `pnpm lint` (oxlint).

## Struttura del repository

```
src/
  features/      una cartella per funzionalità: auth, chat, rooms, translator,
                 notifications, tutorial, tour, sandbox, install, update, theme
  lib/           client Supabase, interfaccia dati, compressione immagini, utilità
  components/    componenti condivisi (barra in basso, avatar, icone)
public/          manifest.json, service worker (sw.js), icone
supabase/
  migrations/    schema del database, policy RLS, job cron
  functions/     Edge Function: translate-message, send-push, cleanup-orphan-photos
  seed.sql       solo per il database locale (vedi sopra)
scripts/         e2e-local.mjs: test end-to-end sullo stack locale
tests/e2e/       test Playwright
```

## Stato del progetto e prossimi passi

Lo sviluppo è in corso. Punti aperti, tracciati in `PLAN.md`:

- provare su telefoni veri: safe area, app installata, fotocamera e download, iPhone;
- provare l'invio foto con un vero file HEIC.

Idee, non ancora in programma: accesso con passkey, captcha sui moduli di accesso.

<!-- TODO: l'hosting e il deploy non sono descritti nel repository. -->

## Licenza

© 2026 M.E.T. Tutti i diritti riservati.
Il codice è pubblico perché si possa leggere e capire come è fatta l'app. Se vuoi riusarne una parte, scrivimi pure: mandras_eugen@yahoo.com.
