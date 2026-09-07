import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from '../../lib/vapidKey'

const STATUS_QUERY_KEY = ['push-subscription-status']

type PushStatus = 'unsupported' | 'subscribed' | 'unsubscribed'

// Fonte di verità: lo stato reale del PushManager di QUESTO dispositivo
// (mai `navigator.serviceWorker.controller`, che può essere null anche a
// registrazione avvenuta — vedi PROMPT_REACT_REWRITE.md lezione 3), non la
// tabella AAA3_push_subscriptions (che elenca tutti i dispositivi di tutti,
// non "questo").
export function usePushSubscriptionStatus() {
  return useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: async (): Promise<PushStatus> => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return subscription ? 'subscribed' : 'unsubscribed'
    },
  })
}

export function useEnablePush(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('Utente non disponibile.')

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permesso per le notifiche negato.')

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Sottoscrizione push incompleta.')
      }

      const { error } = await supabase.from('AAA3_push_subscriptions').upsert(
        { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
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

export function useDisablePush() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) return

      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      const { error } = await supabase.from('AAA3_push_subscriptions').delete().eq('endpoint', endpoint)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY }),
  })
}
