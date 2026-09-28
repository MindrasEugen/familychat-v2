import type { Database } from '../../lib/database.types'

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

// Ordine dei messaggi: created_at, poi id a parità di orario (due messaggi
// scritti nello stesso microsecondo esistono davvero). Deve coincidere con
// l'ordine del database (order created_at, id): per l'id si confrontano i
// caratteri come fa Postgres sugli uuid, non con localeCompare.
export function compareMessages(a: Pick<Message, 'created_at' | 'id'>, b: Pick<Message, 'created_at' | 'id'>) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

// Unisce per id (mai un semplice concat) e riordina — un messaggio arrivato
// più volte da fonti diverse (fetch iniziale, realtime, invio ottimistico)
// collassa sulla stessa riga invece di duplicarsi.
// Vedi PROMPT_REACT_REWRITE.md, lezione 10: la lista non deve mai
// svuotarsi e ripopolarsi da un elenco già in uso da una sottoscrizione
// realtime attiva.
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map(existing.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort(compareMessages)
}
