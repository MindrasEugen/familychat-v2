import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

export function roomQueryKey(roomId: string | undefined) {
  return ['room', roomId] as const
}

export function useRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: roomQueryKey(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_rooms')
        .select('*')
        .eq('id', roomId as string)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: Boolean(roomId),
  })
}

export function roomMembersQueryKey(roomId: string | undefined) {
  return ['room-members', roomId] as const
}

export function useRoomMembers(roomId: string | undefined) {
  return useQuery({
    queryKey: roomMembersQueryKey(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_room_members')
        .select('user_id, role, joined_at, AAA3_profiles(username, avatar_url)')
        .eq('room_id', roomId as string)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: Boolean(roomId),
  })
}
