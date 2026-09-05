import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

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
        .limit(100)

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

// Sottoscrizione realtime: aggiorna direttamente la cache per id, non
// invalida/rifetcha mai la query — un invalidate riavvierebbe il fetch
// completo e riaprirebbe esattamente la finestra di corsa della lezione 10.
// Il canale vive per tutta la durata del mount di questo hook (roomId
// stabile finché si resta sulla stessa camera): niente ricreazione ad
// ogni evento di focus/rete, la riconnessione del socket è già gestita
// dal client Supabase.
export function useRoomMessagesRealtime(roomId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId) return

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, queryClient])
}

export function useSendMessage(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Message, PostgrestError | Error, string>({
    mutationFn: async (body: string) => {
      if (!roomId || !userId) throw new Error('Camera o utente non disponibili.')

      const { data, error } = await supabase
        .from('AAA3_chat_messages')
        .insert({ room_id: roomId, sender_id: userId, body })
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
