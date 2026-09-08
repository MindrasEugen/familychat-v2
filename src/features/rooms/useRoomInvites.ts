import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

type RoomInvite = Database['public']['Tables']['AAA3_room_invites']['Row']

export function roomInvitesQueryKey(roomId: string | undefined) {
  return ['room-invites', roomId] as const
}

export function useRoomInvites(roomId: string | undefined) {
  return useQuery({
    queryKey: roomInvitesQueryKey(roomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_room_invites')
        .select('*')
        .eq('room_id', roomId as string)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: Boolean(roomId),
  })
}

// Invito monouso di default (max_uses: 1) — il documento di decisioni non
// specifica un default, questa è la scelta più semplice e prudente: un
// codice pensato per portare dentro una persona alla volta, non un link
// permanente. Da rivedere se in futuro serve un invito riutilizzabile.
export function useCreateRoomInvite(roomId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<RoomInvite, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!roomId || !userId) throw new Error('Nessuna camera o utente selezionato.')

      const { data, error } = await supabase
        .from('AAA3_room_invites')
        .insert({ room_id: roomId, created_by: userId, max_uses: 1 })
        .select()
        .single()

      if (error) {
        // La policy RLS blocca l'insert anche quando un MEMBRO (non il
        // fondatore, che non ha limite) supera il limite di 5 inviti attivi
        // per camera (vedi migrazione
        // 20260908114715_room_invites_active_limit.sql), non solo quando non
        // si è membri — a questo punto della UI la seconda causa è già
        // esclusa (solo un membro vede questo pulsante), quindi un 42501 qui
        // significa quasi certamente il limite. Messaggio dedicato invece
        // del testo grezzo di Postgres ("new row violates row-level security
        // policy...").
        if (error.code === '42501') {
          throw new Error(
            'Hai raggiunto il limite di 5 inviti attivi per questa camera. Revoca un invito non ancora usato per crearne uno nuovo.',
          )
        }
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomInvitesQueryKey(roomId) })
    },
  })
}

export function useRevokeRoomInvite(roomId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, PostgrestError, string>({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc('revoke_room_invite', { invite_id: inviteId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomInvitesQueryKey(roomId) })
    },
  })
}
