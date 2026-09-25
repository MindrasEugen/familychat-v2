import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

type Room = Database['public']['Tables']['AAA3_rooms']['Row']

export function roomsQueryKey(userId: string | undefined) {
  return ['rooms', userId] as const
}

export type RoomOverview = Database['public']['Functions']['get_my_rooms']['Returns'][number]

// Camere dell'utente con ultimo messaggio e numero di non letti, già
// ordinate dalla più recente (funzione get_my_rooms, security invoker:
// valgono le stesse RLS di prima, si vedono solo le proprie camere).
export function useRooms(userId: string | undefined) {
  return useQuery({
    queryKey: roomsQueryKey(userId),
    queryFn: async (): Promise<RoomOverview[]> => {
      const { data, error } = await supabase.rpc('get_my_rooms')
      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
}

// Tiene aggiornata la lista camere mentre è aperta: ogni messaggio nuovo o
// eliminato in una qualunque delle proprie camere (il realtime rispetta le
// RLS: arrivano solo gli eventi delle camere di cui si è membri) ricarica
// anteprime e contatori. Stesso recupero del canale dopo background/rete di
// useRoomMessagesRealtime (lezione 2).
export function useRoomsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const refresh = () => queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })

    function createChannel() {
      return supabase
        .channel(`rooms-overview-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'AAA3_chat_messages' }, refresh)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'AAA3_chat_messages' }, refresh)
        .subscribe()
    }

    let channel = createChannel()

    function recoverIfDead() {
      if (channel.state === 'joined' || channel.state === 'joining') return
      supabase.removeChannel(channel)
      channel = createChannel()
      refresh()
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
  }, [userId, queryClient])
}

// Segna la camera come letta quando è aperta E visibile: all'apertura, a
// ogni messaggio nuovo mentre la si guarda, e al ritorno in primo piano
// (una camera lasciata aperta in una scheda nascosta non conta come letta).
// Azzera subito il contatore in cache, senza aspettare il server.
export function useMarkRoomRead(roomId: string | undefined, userId: string | undefined, lastMessageId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!roomId || !userId) return

    function markRead() {
      if (document.visibilityState !== 'visible') return
      queryClient.setQueryData<RoomOverview[]>(roomsQueryKey(userId), (rooms) =>
        rooms?.map((room) => (room.id === roomId ? { ...room, unread_count: 0 } : room)),
      )
      supabase.rpc('mark_room_read', { p_room_id: roomId as string }).then(({ error }) => {
        if (error) console.error('mark_room_read fallita', error)
      })
    }

    markRead()
    document.addEventListener('visibilitychange', markRead)
    return () => document.removeEventListener('visibilitychange', markRead)
  }, [roomId, userId, lastMessageId, queryClient])
}

export function useCreateRoom(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Room, PostgrestError, string>({
    mutationFn: async (roomName: string) => {
      const { data, error } = await supabase.rpc('create_room', { room_name: roomName })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}

export function useJoinRoom(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Room, PostgrestError, string>({
    mutationFn: async (inviteCode: string) => {
      const { data, error } = await supabase.rpc('accept_room_invite', {
        invite_code: inviteCode.trim(),
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}
