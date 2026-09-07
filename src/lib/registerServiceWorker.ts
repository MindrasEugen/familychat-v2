// Registrato una sola volta all'avvio (vedi App.tsx), solo per abilitare le
// notifiche push (vedi src/features/notifications) — non un service worker
// da PWA offline-first, quella resta una decisione a sé (vedi PLAN.md).
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.error('Registrazione service worker fallita', err)
  })
}
