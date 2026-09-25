import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import { roomsQueryKey } from './useRooms'

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
        .select('user_id, role, joined_at, notifications_muted, AAA3_profiles(username, avatar_url)')
        .eq('room_id', roomId as string)
        .order('joined_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: Boolean(roomId),
  })
}

// Il fondatore non può "lasciare" (lascerebbe la camera senza fondatore ma
// ancora esistente) — per lui l'unica azione è eliminare la camera intera.
export function useLeaveRoom(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!roomId || !userId) throw new Error('Camera o utente non disponibili.')
      const { error } = await supabase
        .from('AAA3_room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomMembersQueryKey(roomId) })
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}

export function useRemoveMember(roomId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (memberUserId: string) => {
      if (!roomId) throw new Error('Camera non disponibile.')
      const { error } = await supabase
        .from('AAA3_room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', memberUserId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomMembersQueryKey(roomId) })
    },
  })
}

export function useDeleteRoom(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase.from('AAA3_rooms').delete().eq('id', roomId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}

// Silenzia/riattiva le notifiche di UNA camera per chi chiama (funzione
// security definer: tocca solo la propria riga e solo questa colonna).
// Aggiorna subito la lista membri in cache, così l'interruttore risponde
// senza attendere il ricaricamento.
export function useSetRoomNotificationsMuted(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, boolean>({
    mutationFn: async (muted) => {
      if (!roomId) throw new Error('Camera non disponibile.')
      const { error } = await supabase.rpc('set_room_notifications_muted', { p_room_id: roomId, p_muted: muted })
      if (error) throw error
    },
    onSuccess: (_, muted) => {
      queryClient.setQueryData<ReturnType<typeof useRoomMembers>['data']>(roomMembersQueryKey(roomId), (members) =>
        members?.map((member) => (member.user_id === userId ? { ...member, notifications_muted: muted } : member)),
      )
    },
  })
}
