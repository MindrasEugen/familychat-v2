import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { useDataApi } from '../../lib/dataApi'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'
import { MESSAGES_PAGE_SIZE } from '../../lib/supabaseDataApi'

export { MESSAGES_PAGE_SIZE }
// Tetto lato client (oltre al vincolo DB "AAA3_chat_messages_image_paths_max_10"),
// scelto esplicitamente dall'utente — evita di far partire fino a 10 upload
// per poi scoprire il rifiuto solo all'insert finale.
export const MAX_PHOTOS_PER_MESSAGE = 10

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
  const api = useDataApi()

  return useQuery({
    queryKey: messagesQueryKey(roomId),
    queryFn: async () => {
      const fetched = await api.getMessages(roomId as string)
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
  const api = useDataApi()

  return useMutation<number, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!roomId) throw new Error('Camera non disponibile.')

      const current = queryClient.getQueryData<Message[]>(messagesQueryKey(roomId)) ?? []
      const oldest = current[0]
      if (!oldest) return 0

      const fetched = await api.getMessages(roomId, oldest.created_at)
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
// altrimenti un canale sano verrebbe ricreato inutilmente).
//
// Ogni volta che il canale diventa SUBSCRIBED (primo collegamento, rejoin
// automatico di supabase-js, ricreazione qui sotto) un unico invalidate
// recupera i messaggi inseriti mentre non eravamo iscritti, che il realtime
// non riconsegna retroattivamente. Serve anche all'apertura della camera: il
// fetch iniziale parte prima che il canale sia collegato, e un messaggio
// arrivato in mezzo andava perso fino al ricaricamento (verificato da
// tests/e2e/lesson10.spec.ts). Il fetch fa merge per id, quindi è innocuo.
export function useRoomMessagesRealtime(roomId: string | undefined) {
  const queryClient = useQueryClient()
  const { sandbox } = useDataApi()

  useEffect(() => {
    if (!roomId || sandbox) return

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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') queryClient.invalidateQueries({ queryKey: messagesQueryKey(roomId) })
        })
    }

    let channel = createChannel()

    function recoverIfDead() {
      if (channel.state === 'joined' || channel.state === 'joining') return
      supabase.removeChannel(channel)
      channel = createChannel()
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
  }, [roomId, sandbox, queryClient])
}

export function useSendMessage(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<Message, PostgrestError | Error, { body: string; imageFiles: File[] }>({
    mutationFn: async ({ body, imageFiles }) => {
      if (!roomId || !userId) throw new Error('Camera o utente non disponibili.')
      return api.sendMessage(roomId, userId, body, imageFiles)
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
  const api = useDataApi()

  return useMutation<void, PostgrestError | Error, { id: string; imagePaths: string[] }>({
    mutationFn: async ({ id, imagePaths }) => {
      if (!roomId) throw new Error('Camera non disponibile.')
      await api.deleteMessage(id, imagePaths)
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
