import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataApi } from '../../lib/dataApi'
import { roomsQueryKey } from './useRooms'

export function roomQueryKey(roomId: string | undefined) {
  return ['room', roomId] as const
}

export function useRoom(roomId: string | undefined) {
  const api = useDataApi()

  return useQuery({
    queryKey: roomQueryKey(roomId),
    queryFn: () => api.getRoom(roomId as string),
    enabled: Boolean(roomId),
  })
}

export function roomMembersQueryKey(roomId: string | undefined) {
  return ['room-members', roomId] as const
}

export function useRoomMembers(roomId: string | undefined) {
  const api = useDataApi()

  return useQuery({
    queryKey: roomMembersQueryKey(roomId),
    queryFn: () => api.getRoomMembers(roomId as string),
    enabled: Boolean(roomId),
  })
}

// Il fondatore non può "lasciare" (lascerebbe la camera senza fondatore ma
// ancora esistente) — per lui l'unica azione è eliminare la camera intera.
export function useLeaveRoom(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!roomId || !userId) throw new Error('Camera o utente non disponibili.')
      await api.removeRoomMember(roomId, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomMembersQueryKey(roomId) })
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}

export function useRemoveMember(roomId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, Error, string>({
    mutationFn: async (memberUserId: string) => {
      if (!roomId) throw new Error('Camera non disponibile.')
      await api.removeRoomMember(roomId, memberUserId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomMembersQueryKey(roomId) })
    },
  })
}

export function useDeleteRoom(userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, Error, string>({
    mutationFn: (roomId: string) => api.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomsQueryKey(userId) })
    },
  })
}

// Silenzia/riattiva le notifiche di UNA camera per chi chiama.
// Aggiorna subito la lista membri in cache, così l'interruttore risponde
// senza attendere il ricaricamento.
export function useSetRoomNotificationsMuted(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, Error, boolean>({
    mutationFn: async (muted) => {
      if (!roomId) throw new Error('Camera non disponibile.')
      await api.setRoomNotificationsMuted(roomId, muted)
    },
    onSuccess: (_, muted) => {
      queryClient.setQueryData<ReturnType<typeof useRoomMembers>['data']>(roomMembersQueryKey(roomId), (members) =>
        members?.map((member) => (member.user_id === userId ? { ...member, notifications_muted: muted } : member)),
      )
    },
  })
}
