// Service worker minimale, solo per le notifiche push — nessun caching
// dell'app shell qui (la PWA/offline è una decisione ancora aperta, vedi
// PLAN.md, non va data per scontata solo aggiungendo un service worker).
//
// Semplificazione deliberata rispetto a v1: qui il client usa React Router
// con URL reali (/rooms/<id>), quindi per sapere se una camera è già aperta
// e visibile basta leggere `client.url` da clients.matchAll() nel momento
// stesso in cui arriva la push — non serve lo stato persistito in IndexedDB
// né il message-passing client->SW che v1 usava (necessario lì solo perché
// la sua UI non rifletteva la camera attiva nell'URL). Meno stato da tenere
// sincronizzato, stesso risultato.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = { title: 'Chat Famiglia', body: 'Nuovo messaggio', room_id: null }
  try {
    if (event.data) data = event.data.json()
  } catch {
    // payload non-JSON o assente: usa i default sopra
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Sopprimi solo se una finestra visibile/in focus è aperta proprio
      // sulla camera del messaggio — altrimenti (altra camera, lista
      // camere, o nessuna finestra) la notifica deve comunque comparire.
      // Rete di sicurezza rispetto all'esclusione lato server in
      // send-push (che copre solo "non notificare chi ha scritto"):
      // questa copre "non notificare chi sta già guardando questa camera",
      // utile per i messaggi di ALTRI membri della stessa camera.
      const roomAlreadyOpen = data.room_id
        ? clientList.some(
            (client) =>
              (client.focused || client.visibilityState === 'visible') &&
              client.url.includes(`/rooms/${data.room_id}`),
          )
        : false

      if (roomAlreadyOpen) return

      return self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        data: { room_id: data.room_id || null },
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  const roomId = event.notification.data?.room_id
  event.notification.close()
  const targetUrl = roomId ? `/rooms/${roomId}` : '/rooms'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      const existing = clientList.find((client) => 'focus' in client)
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(targetUrl)
        return
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
