import type { Database } from '../../lib/database.types'

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?)?$/

// Microsecondi dall'epoca, qualunque sia la scrittura dell'orario (decimali
// variabili, "Z" / "+00" / "+00:00" / altri fusi, "T" o spazio). Date lavora
// ai millisecondi: i microsecondi si aggiungono a parte (Postgres ne ha 6).
// null se il formato non è riconosciuto.
function toMicros(timestamp: string): number | null {
  const match = TIMESTAMP.exec(timestamp)
  if (!match) return null
  const [, date, time, fraction = '', zone = 'Z'] = match
  const offset = zone === 'Z' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(3).replace(':', '') || '00'}`
  const milliseconds = Date.parse(`${date}T${time}${offset}`)
  if (Number.isNaN(milliseconds)) return null
  return milliseconds * 1000 + Number(fraction.padEnd(6, '0').slice(0, 6))
}

// Ordine dei messaggi: created_at, poi id a parità di orario (due messaggi
// scritti nello stesso microsecondo esistono davvero). Deve coincidere con
// l'ordine del database (order created_at, id): l'orario si confronta come
// istante, non come testo (oggi PostgREST e realtime lo scrivono sempre in
// UTC con "+00:00", ma dipende dal fuso del server); per l'id si confrontano
// i caratteri come fa Postgres sugli uuid, non con localeCompare.
export function compareMessages(a: Pick<Message, 'created_at' | 'id'>, b: Pick<Message, 'created_at' | 'id'>) {
  const aTime = toMicros(a.created_at)
  const bTime = toMicros(b.created_at)
  if (aTime !== null && bTime !== null) {
    if (aTime !== bTime) return aTime < bTime ? -1 : 1
  } else if (a.created_at !== b.created_at) {
    // Formato sconosciuto: meglio il confronto tra testi che nessun ordine.
    return a.created_at < b.created_at ? -1 : 1
  }
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
