import { isNativeApp } from './platform'

// Registrato una sola volta all'avvio (vedi App.tsx), solo per abilitare le
// notifiche push (vedi src/features/notifications) — non un service worker
// da PWA offline-first, quella resta una decisione a sé (vedi PLAN.md).
// Nell'app Android nativa niente service worker: lì le notifiche passano da
// Firebase (vedi src/features/notifications), non da Web Push.
export function registerServiceWorker() {
  if (isNativeApp() || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.error('Registrazione service worker fallita', err)
  })
}
