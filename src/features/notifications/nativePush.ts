import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isNativeApp } from '../../lib/platform'
import { supabase } from '../../lib/supabaseClient'
import type { PushStatus } from './usePushSubscription'

// Notifiche dell'app Android nativa (Capacitor + Firebase Cloud Messaging).
// Nel browser restano le Web Push di usePushSubscription.ts: stesse regole
// (stato per account, "Disattiva" toglie solo la riga del proprio account,
// una notifica per camera chiusa all'apertura della camera), altro canale.
//
// Le notifiche le mostra Android stesso (messaggi FCM con "notification" e
// priorità alta, vedi send-push): arrivano anche ad app chiusa e telefono in
// standby, senza dipendere dal browser. Con l'app in primo piano Android non
// le mostra: la lista camere e la chat si aggiornano già in tempo reale.

// Canale con importanza alta (suono + banner). Deve coincidere con
// `channel_id` in send-push e con il default nel manifest Android.
export const MESSAGES_CHANNEL_ID = 'messages'
const TOKEN_TIMEOUT_MS = 10000

let tokenPromise: Promise<string> | null = null

// Il token FCM di questo dispositivo: register() lo chiede a Firebase e lo
// consegna con l'evento "registration". Uno per dispositivo, condiviso dai
// due account del multi-account. In caso di errore si riprova alla
// chiamata successiva.
function getFcmToken(): Promise<string> {
  tokenPromise ??= requestFcmToken().catch((err: unknown) => {
    tokenPromise = null
    throw err
  })
  return tokenPromise
}

async function requestFcmToken(): Promise<string> {
  const handles: PluginListenerHandle[] = []
  try {
    return await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Firebase non ha risposto. Controlla la connessione e riprova.')),
        TOKEN_TIMEOUT_MS,
      )
      Promise.all([
        PushNotifications.addListener('registration', ({ value }) => {
          clearTimeout(timer)
          resolve(value)
        }),
        PushNotifications.addListener('registrationError', ({ error }) => {
          clearTimeout(timer)
          reject(new Error(`Registrazione per le notifiche non riuscita: ${error}`))
        }),
      ])
        .then((added) => {
          handles.push(...added)
          return PushNotifications.register()
        })
        .catch((err: unknown) => {
          clearTimeout(timer)
          reject(err instanceof Error ? err : new Error(String(err)))
        })
    })
  } finally {
    for (const handle of handles) void handle.remove()
  }
}

export async function createMessagesChannel() {
  await PushNotifications.createChannel({
    id: MESSAGES_CHANNEL_ID,
    name: 'Messaggi',
    description: 'Nuovi messaggi nelle camere',
    importance: 4,
    visibility: 1,
    vibration: true,
  })
}

export async function getNativePushStatus(userId: string | undefined): Promise<PushStatus> {
  const { receive } = await PushNotifications.checkPermissions()
  if (receive === 'denied') return 'denied'
  if (receive !== 'granted' || !userId) return 'unsubscribed'

  const token = await getFcmToken()
  const { data, error } = await supabase
    .from('AAA3_fcm_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  return data ? 'subscribed' : 'unsubscribed'
}

export async function enableNativePush(userId: string) {
  const { receive } = await PushNotifications.requestPermissions()
  if (receive !== 'granted') {
    throw new Error('Permesso negato: riattiva le notifiche per Chat Famiglia nelle impostazioni del telefono.')
  }

  await createMessagesChannel()
  const token = await getFcmToken()
  const { error } = await supabase
    .from('AAA3_fcm_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'user_id,token', ignoreDuplicates: true })
  if (error) throw error
}

// Solo la riga di questo account: il token resta valido per l'altro account
// sullo stesso telefono.
export async function disableNativePush(userId: string) {
  const token = await getFcmToken()
  const { error } = await supabase.from('AAA3_fcm_tokens').delete().eq('user_id', userId).eq('token', token)
  if (error) throw error
}

// Chiude le notifiche già mostrate per questa camera: send-push le etichetta
// con il tag `room-<id>` (una per camera, la nuova sostituisce la vecchia).
export async function dismissNativeRoomNotifications(roomId: string) {
  const { notifications } = await PushNotifications.getDeliveredNotifications()
  const forRoom = notifications.filter((notification) => notification.tag === `room-${roomId}`)
  if (forRoom.length > 0) await PushNotifications.removeDeliveredNotifications({ notifications: forRoom })
}

// Tocco su una notifica (anche ad app chiusa: il plugin conserva l'evento
// finché non c'è un listener) → apre la camera del messaggio. Va montato
// dentro il router.
export function useOpenRoomFromNativeNotification() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNativeApp()) return
    const handle = PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const roomId = (notification.data as { room_id?: string } | undefined)?.room_id
      navigate(roomId ? `/rooms/${roomId}` : '/rooms')
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [navigate])
}
