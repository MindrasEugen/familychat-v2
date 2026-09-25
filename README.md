# familychat-v2

Riscrittura React di "Chat Famiglia" (v1: `../FamilyChat`, PWA statica HTML/CSS/JS
+ Supabase, resta in produzione durante questo lavoro). Vedi
`PROMPT_REACT_REWRITE.md` per il documento completo di decisioni e
`PLAN.md` per lo stato di avanzamento (fatto / da fare).

## Comandi

```bash
pnpm install        # installa le dipendenze
pnpm dev             # server di sviluppo (http://localhost:5173)
pnpm build           # type-check + build di produzione
pnpm preview         # serve la build di produzione in locale
pnpm test            # unit/component test (Vitest + React Testing Library)
pnpm test:watch      # come sopra, in watch mode
pnpm exec playwright install   # solo la prima volta, scarica i browser di test
pnpm test:e2e        # test end-to-end (Playwright)
pnpm lint            # oxlint
```

Se pnpm si comporta in modo strano (lockfile del progetto non aggiornato,
`pnpm test`/`pnpm lint` bloccati sul controllo dipendenze), vedi la nota su
`C:\Users\mandr` nelle "Note di processo" di `PLAN.md`.

## Configurazione

Copia `.env.example` in `.env.local` e valorizza `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` con i valori del progetto Supabase esistente
(Project Settings → API su supabase.com) — si riusa lo stesso backend
della v1, non un progetto nuovo (vedi `PROMPT_REACT_REWRITE.md`,
"Proposta finale").

## Struttura

```
src/
  lib/            # client Supabase, QueryClient di TanStack Query
  components/     # pezzi grafici condivisi (icone, avatar)
  index.css       # token colore dei due temi e stili dell'app
  features/
    auth/         # login/registrazione, profilo personale
    rooms/        # elenco camere, creazione, inviti
    chat/         # singola camera: cronologia, invio, traduzione inline
    translator/   # traduttore standalone, indipendente dalla chat
    notifications/ # service worker, Web Push
    theme/        # tema scuro (predefinito) / chiaro, scelta salvata
tests/e2e/        # test Playwright
```

Ogni feature è un modulo separato per responsabilità — niente file
monolitico che sincronizza a mano stato e DOM (era il problema principale
della v1, vedi `PROMPT_REACT_REWRITE.md` lezione 7).

## Stato

Funzionalità principali implementate (accesso e multi-account, camere e
inviti, chat con foto e traduzione automatica Google → Azure → Mistral,
notifiche push, PWA) e nuova grafica con tema scuro/chiaro. Online su
Render in parallelo alla v1. Vedi `PLAN.md` per cosa resta aperto e
`NOTE.md` per lo storico.
