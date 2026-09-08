import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'
import { compressImage } from '../../lib/imageCompression'

const PHOTO_BUCKET = 'room-photos'
export const MESSAGES_PAGE_SIZE = 100
// Tetto lato client (oltre al vincolo DB "AAA3_chat_messages_image_paths_max_10"),
// scelto esplicitamente dall'utente — evita di far partire fino a 10 upload
// per poi scoprire il rifiuto solo all'insert finale.
export const MAX_PHOTOS_PER_MESSAGE = 10

function fileExtension(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name)
  return match ? match[1].toLowerCase() : 'bin'
}

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

export function messagesQueryKey(roomId: string | undefined) {
  return ['messages', roomId] as const
}

// Unisce per id (mai un semplice concat) e riordina per created_at — un
// messaggio arrivato più volte da fonti diverse (fetch iniziale, realtime,
// invio ottimistico) collassa sulla stessa riga invece di duplicarsi.
// Vedi PROMPT_REACT_REWRITE.md, lezione 10: la lista non deve mai
// svuotarsi e ripopolarsi da un elenco già in uso da una sottoscrizione
// realtime attiva.
function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byId = new Map(existing.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function useMessages(roomId: string | undefined) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: messagesQueryKey(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_chat_messages')
        .select('*')
        .eq('room_id', roomId as string)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE)

      if (error) throw error

      const fetched = [...data].reverse()
      // Merge sul risultato già in cache invece di sostituirlo: se un
      // messaggio realtime è arrivato mentre questo fetch era in volo,
      // resta comunque nella lista finale invece di sparire quando il
      // fetch "vince" e sovrascrive tutto.
      const current = queryClient.getQueryData<Message[]>(messagesQueryKey(roomId)) ?? []
      return mergeMessages(current, fetched)
    },
    enabled: Boolean(roomId),
  })
}

// Carica la pagina di messaggi precedente a quella già in cache — stesso
// pattern fetch+merge del resto del file (mai una sostituzione grezza),
// così una pagina più vecchia si somma alla lista già in uso da realtime
// invece di rientrare in conflitto con essa (lezione 10). Ritorna il numero
// di messaggi trovati: il chiamante lo usa per capire se la cronologia è
// finita (meno di una pagina piena = non ce ne sono altri prima).
export function useLoadOlderMessages(roomId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<number, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!roomId) throw new Error('Camera non disponibile.')

      const current = queryClient.getQueryData<Message[]>(messagesQueryKey(roomId)) ?? []
      const oldest = current[0]
      if (!oldest) return 0

      const { data, error } = await supabase
        .from('AAA3_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PAGE_SIZE)

      if (error) throw error

      const fetched = [...data].reverse()
      queryClient.setQueryData<Message[]>(messagesQueryKey(roomId), (old) =>
        mergeMessages(old ?? [], fetched),
      )
      return fetched.length
    },
  })
}

// Sottoscrizione realtime: aggiorna direttamente la cache per id, non
// invalida/rifetcha mai la query per un singolo evento — un invalidate per
// ogni INSERT/DELETE riaprirebbe esattamente la finestra di corsa della
// lezione 10. Il canale vive per tutta la durata del mount di questo hook
// (roomId stabile finché si resta sulla stessa camera): niente ricreazione
// ad ogni evento di focus/rete "di routine", la riconnessione del socket è
// già gestita dal client Supabase.
//
// Eccezione deliberata (lezione 2 + lezione 10 seconda parte): un tab in
// background a lungo, o una rete che cade e torna, può lasciare il socket
// realtime "zombie" — ancora segnato come vivo lato client ma non più
// raggiunto dal server, perché i timer di heartbeat/riconnessione di
// supabase-js vengono congelati insieme al resto della tab, non solo il
// socket. Al ritorno in foreground o in rete verifichiamo lo STATO reale
// del canale e lo ricreiamo solo se non è più "joined" (mai ad ogni evento,
// altrimenti un canale sano verrebbe ricreato inutilmente). Una volta
// ricreato, un unico invalidate (non per-evento, quindi non in contrasto
// con la nota sopra) recupera i messaggi arrivati durante la finestra morta,
// che una sottoscrizione realtime non può riconsegnare retroattivamente.
export function useRoomMessagesRealtime(roomId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId) return

    function createChannel() {
      return supabase
        .channel(`room-messages-${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'AAA3_chat_messages', filter: `room_id=eq.${roomId}` },
          (payload) => {
            queryClient.setQueryData<Message[]>(messagesQueryKey(roomId), (old) =>
              mergeMessages(old ?? [], [payload.new as Message]),
            )
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'AAA3_chat_messages', filter: `room_id=eq.${roomId}` },
          (payload) => {
            const deletedId = (payload.old as Message).id
            queryClient.setQueryData<Message[]>(messagesQueryKey(roomId), (old) =>
              (old ?? []).filter((message) => message.id !== deletedId),
            )
          },
        )
        .subscribe()
    }

    let channel = createChannel()

    function recoverIfDead() {
      if (channel.state === 'joined' || channel.state === 'joining') return
      supabase.removeChannel(channel)
      channel = createChannel()
      queryClient.invalidateQueries({ queryKey: messagesQueryKey(roomId) })
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') recoverIfDead()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', recoverIfDead)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', recoverIfDead)
      supabase.removeChannel(channel)
    }
  }, [roomId, queryClient])
}

async function uploadMessagePhoto(roomId: string, file: File): Promise<string> {
  // Se la compressione fallisce su tutte le strategie, carichiamo il file
  // originale così com'è invece di bloccare l'invio (lezione 5): il
  // messaggio deve arrivare comunque.
  const compressed = await compressImage(file)
  const toUpload = compressed ?? file
  const ext = compressed ? 'jpg' : fileExtension(file)
  const contentType = compressed ? 'image/jpeg' : file.type || 'application/octet-stream'
  // Path "<room_id>/<file>": le policy RLS sul bucket leggono il primo
  // segmento come room_id per verificare l'appartenenza alla camera.
  const path = `${roomId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, toUpload, { contentType })
  if (uploadError) throw uploadError
  return path
}

export function useSendMessage(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Message, PostgrestError | Error, { body: string; imageFiles: File[] }>({
    mutationFn: async ({ body, imageFiles }) => {
      if (!roomId || !userId) throw new Error('Camera o utente non disponibili.')

      // Compressione + upload in parallelo, non in sequenza: con fino a 10
      // foto (alcune potenzialmente HEIC, cascata di compressione più lenta)
      // un upload sequenziale sarebbe percepibilmente lento senza motivo,
      // ogni file è indipendente dagli altri.
      const imagePaths = await Promise.all(imageFiles.map((file) => uploadMessagePhoto(roomId, file)))

      const { data, error } = await supabase
        .from('AAA3_chat_messages')
        .insert({ room_id: roomId, sender_id: userId, body: body.trim() || null, image_paths: imagePaths })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (message) => {
      // Merge immediato per reattività — arriverà comunque anche via
      // realtime, ma il merge per id lo rende un no-op innocuo.
      queryClient.setQueryData<Message[]>(messagesQueryKey(roomId), (old) =>
        mergeMessages(old ?? [], [message]),
      )
    },
  })
}

export function useDeleteMessage(roomId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, PostgrestError | Error, { id: string; imagePaths: string[] }>({
    mutationFn: async ({ id, imagePaths }) => {
      if (!roomId) throw new Error('Camera non disponibile.')

      const { error } = await supabase.from('AAA3_chat_messages').delete().eq('id', id)

      if (error) throw error

      // Best-effort: prova a rimuovere i file associati (uno o più), ma non
      // bloccare se fallisce — la riga in DB è comunque cancellata
      // correttamente. remove() accetta già un array, una sola chiamata.
      if (imagePaths.length > 0) {
        await supabase.storage.from(PHOTO_BUCKET).remove(imagePaths).catch(() => {})
      }
    },
    onSuccess: (_, { id }) => {
      // Rimuovi il messaggio dalla cache per reattività immediata — il
      // realtime farà comunque lo stesso filtro poco dopo, ma il merge
      // per id lo rende un no-op innocuo.
      queryClient.setQueryData<Message[]>(messagesQueryKey(roomId), (old) =>
        (old ?? []).filter((message) => message.id !== id),
      )
    },
  })
}
