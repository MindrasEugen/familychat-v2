# notifications

Placeholder — nessun codice ancora. Da implementare:

- Registrazione service worker + sottoscrizione Web Push (VAPID).
- Chiusura affidabile delle notifiche di sistema al ritorno in primo piano
  **e** al primo caricamento a freddo, usando `navigator.serviceWorker.ready`
  (mai `.controller`, che può essere `null` — vedi PROMPT_REACT_REWRITE.md
  lezione 3).
- La soppressione "sono già su questa chat" va delegata principalmente al
  server (esclusione del mittente in `send-push`, lezione 8), non a uno
  stato in memoria nel service worker (lezione 9).
