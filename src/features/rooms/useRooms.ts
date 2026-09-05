import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

type Room = Database['public']['Tables']['AAA3_rooms']['Row']

export function roomsQueryKey(userId: string | undefined) {
  return ['rooms', userId] as const
}

// RLS filtra già alle sole camere di cui l'utente è membro (vedi
// "rooms_select_if_member" nella migrazione): niente filtro client-side.
export function useRooms(userId: string | undefined) {
  return useQuery({
    queryKey: roomsQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_rooms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
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
