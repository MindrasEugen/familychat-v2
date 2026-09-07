// Stessa coppia di chiavi VAPID già in uso da v1 (secret VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY sul progetto Supabase condiviso, invariati) — la
// pubblica è sicura da esporre lato client per design (è nel codice
// sorgente committato di v1 stesso), un dispositivo può restare
// sottoscritto sia a v1 sia a v2 senza conflitti (sottoscrizioni per
// endpoint, non per account).
export const VAPID_PUBLIC_KEY =
  'BJhBpx9peKaS2Ze3xFzAgQUb5hzRPI35LhCKi9eqNigP_xRDyM1haDB6RRhpRbIr48o-rX1XzPM10ay78LbjJrE'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
