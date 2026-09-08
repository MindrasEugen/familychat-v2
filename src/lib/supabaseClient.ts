import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devono essere impostate (vedi .env.example).',
  )
}

// Multi-account sullo stesso dispositivo (vedi PLAN.md/NOTE.md): ogni
// "slot" è un secchio di sessione Supabase indipendente (storageKey
// diverso in localStorage), così due account possono restare entrambi
// autenticati/con token aggiornati in background senza sovrascriversi a
// vicenda — Supabase usa una chiave fissa per sessione di default, il che
// è esattamente ciò che oggi fa perdere la sessione di un account quando
// un secondo fa login sullo stesso browser. Limite di 2 slot su richiesta
// esplicita dell'utente (non tecnico: si potrebbero aggiungere altri slot
// allo stesso modo).
export const ACCOUNT_SLOTS = ['account-1', 'account-2'] as const
export type AccountSlot = (typeof ACCOUNT_SLOTS)[number]
export const MAX_ACCOUNTS = ACCOUNT_SLOTS.length

const clientsBySlot = new Map<AccountSlot, SupabaseClient<Database>>()

export function getClientForSlot(slot: AccountSlot): SupabaseClient<Database> {
  let client = clientsBySlot.get(slot)
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { storageKey: `sb-familychat-${slot}-auth-token` },
    })
    clientsBySlot.set(slot, client)
  }
  return client
}

// Slot "attivo" di default finché accountsStore non lo allinea allo stato
// persistito all'avvio (vedi initAccounts in accountsStore.ts) — serve
// comunque un client valido da subito perché LoginPage possa operare prima
// che quell'inizializzazione asincrona sia completata.
let activeSlot: AccountSlot = ACCOUNT_SLOTS[0]
let activeClient: SupabaseClient<Database> = getClientForSlot(activeSlot)

export function getActiveSlot(): AccountSlot {
  return activeSlot
}

// Cambia SOLO il client verso cui inoltra il proxy `supabase` sotto — non
// tocca sessionStore, la lista account persistita, né forza un remount
// dell'albero React. Quella logica di più alto livello vive in
// accountsStore.ts (switchActiveAccount), che chiama questa funzione come
// un dettaglio implementativo, non il contrario.
export function setActiveClientSlot(slot: AccountSlot) {
  activeSlot = slot
  activeClient = getClientForSlot(slot)
}

// Un Proxy invece di un binding fisso: ogni file del progetto continua a
// scrivere `import { supabase } from '.../supabaseClient'` e a chiamare
// `supabase.from(...)`/`.auth.xxx`/`.channel(...)` esattamente come prima
// — undici file lo fanno già — senza dover passare un client come parametro
// ovunque. Il proxy inoltra sempre alla CHIAMATA corrente su
// `activeClient`, quindi riflette immediatamente un cambio di account.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, _receiver) {
    const value = Reflect.get(activeClient as object, prop)
    return typeof value === 'function' ? value.bind(activeClient) : value
  },
}) as SupabaseClient<Database>
