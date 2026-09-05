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
  features/
    auth/         # login/registrazione, profilo personale
    rooms/        # elenco camere, creazione, inviti
    chat/         # singola camera: cronologia, invio, traduzione inline
    translator/   # traduttore standalone, indipendente dalla chat
    notifications/ # service worker, Web Push
tests/e2e/        # test Playwright
```

Ogni feature è un modulo separato per responsabilità — niente file
monolitico che sincronizza a mano stato e DOM (era il problema principale
della v1, vedi `PROMPT_REACT_REWRITE.md` lezione 7).

## Stato

Solo scaffold: routing e struttura pronti, nessuna feature reale ancora
implementata. Vedi `PLAN.md` per l'elenco dettagliato di cosa manca.
