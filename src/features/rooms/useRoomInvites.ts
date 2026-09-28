import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { useDataApi } from '../../lib/dataApi'
import type { Database } from '../../lib/database.types'

type RoomInvite = Database['public']['Tables']['AAA3_room_invites']['Row']

export function roomInvitesQueryKey(roomId: string | undefined) {
  return ['room-invites', roomId] as const
}

export function useRoomInvites(roomId: string | undefined) {
  const api = useDataApi()

  return useQuery({
    queryKey: roomInvitesQueryKey(roomId),
    queryFn: () => api.getRoomInvites(roomId as string),
    enabled: Boolean(roomId),
  })
}

// Invito monouso (vedi createRoomInvite in lib/supabaseDataApi.ts).
export function useCreateRoomInvite(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<RoomInvite, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!roomId || !userId) throw new Error('Nessuna camera o utente selezionato.')
      return api.createRoomInvite(roomId, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomInvitesQueryKey(roomId) })
    },
  })
}

export function useRevokeRoomInvite(roomId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, PostgrestError, string>({
    mutationFn: (inviteId: string) => api.revokeRoomInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomInvitesQueryKey(roomId) })
    },
  })
}
