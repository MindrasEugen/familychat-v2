import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '../../lib/vapidKey'

const SERVICE_WORKER_TIMEOUT_MS = 5000

export type PushStatus =
  | 'subscribed'
  | 'unsubscribed'
  // Permesso negato nelle impostazioni del browser: da qui non si può
  // richiedere di nuovo, va riattivato a mano.
  | 'denied'
  // iPhone/iPad: le notifiche web esistono solo nell'app installata sulla
  // schermata Home, non in Safari.
  | 'ios-needs-install'
  | 'unsupported'

export function pushStatusQueryKey(userId: string | undefined) {
  return ['push-subscription-status', userId] as const
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  // navigator.standalone esiste solo su Safari iOS (non è nei tipi DOM).
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isBrave() {
  return 'brave' in navigator
}

// `ready` non si risolve mai se il service worker non si è registrato:
// senza un tetto la campanella resterebbe "in caricamento" per sempre.
async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVICE_WORKER_TIMEOUT_MS)),
  ])
}

// Stato PER ACCOUNT su questo dispositivo: il browser deve avere una
// sottoscrizione (PushManager, mai `serviceWorker.controller` — lezione 3)
// E il database deve avere la riga (utente, endpoint). Solo la prima non
// basta: con due account sullo stesso telefono, o se la riga è andata persa,
// la campanella risultava "attiva" senza che arrivasse nulla.
export function usePushSubscriptionStatus(userId: string | undefined) {
  return useQuery({
    queryKey: pushStatusQueryKey(userId),
    queryFn: async (): Promise<PushStatus> => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported'
      }
      if (Notification.permission === 'denied') return 'denied'

      const registration = await serviceWorkerRegistration()
      if (!registration) return 'unsupported'

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription || !userId) return 'unsubscribed'

      const { data, error } = await supabase
        .from('AAA3_push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle()
      if (error) throw error
      return data ? 'subscribed' : 'unsubscribed'
    },
    enabled: Boolean(userId),
  })
}

export function useEnablePush(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('Utente non disponibile.')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permesso negato: riattiva le notifiche per questo sito nelle impostazioni del browser.')
      }

      const registration = await serviceWorkerRegistration()
      if (!registration) throw new Error('Il browser non ha avviato il servizio per le notifiche. Ricarica la pagina e riprova.')

      // Riusa la sottoscrizione del dispositivo se c'è già (es. creata
      // dall'altro account su questo telefono): è la stessa per tutti.
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
          })
        } catch {
          throw new Error(
            isBrave()
              ? 'Brave blocca le notifiche: in Impostazioni → Privacy e sicurezza attiva "Usa i servizi Google per la messaggistica push", poi riprova.'
              : 'Il browser non ha potuto attivare le notifiche. Riprova più tardi.',
          )
        }
      }

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Sottoscrizione push incompleta.')
      }

      const { error } = await supabase.from('AAA3_push_subscriptions').upsert(
        { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'user_id,endpoint' },
      )
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: pushStatusQueryKey(userId) }),
  })
}

// Disattiva solo per QUESTO account: la sottoscrizione del browser resta,
// perché l'altro account sullo stesso telefono potrebbe usarla. Senza la
// riga nel database il server non manda più nulla a questo account.
export function useDisablePush(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('Utente non disponibile.')
      const registration = await serviceWorkerRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) return

      const { error } = await supabase
        .from('AAA3_push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: pushStatusQueryKey(userId) }),
  })
}

// Chiude le notifiche di sistema già mostrate per QUESTA camera quando la
// si apre — sia tornando in primo piano sia al primo caricamento a freddo
// (lezione 9, entrambi i casi: un effect al mount copre già entrambi,
// nessun listener separato su "visibilitychange" necessario). Usa sempre
// `navigator.serviceWorker.ready`, mai `.controller` (lezione 3: può
// essere null anche a registrazione avvenuta). Non tocca le notifiche di
// ALTRE camere, che restano visibili come segnale di "non letto".
export function useDismissRoomNotifications(roomId: string | undefined) {
  useEffect(() => {
    if (!roomId || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready
      .then((registration) => registration.getNotifications())
      .then((notifications) => {
        for (const notification of notifications) {
          if (notification.data?.room_id === roomId) notification.close()
        }
      })
      .catch(() => {})
  }, [roomId])
}
