import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { useDataApi } from '../../lib/dataApi'
import type { Database } from '../../lib/database.types'

type Profile = Database['public']['Tables']['AAA3_profiles']['Row']

export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const
}

export function useProfile(userId: string | undefined) {
  const api = useDataApi()

  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => api.getProfile(userId as string),
    enabled: Boolean(userId),
  })
}

export function useCompleteProfile(userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<Profile, PostgrestError | Error, { username: string; avatarFile: File | null }>({
    mutationFn: async ({ username, avatarFile }) => {
      if (!userId) throw new Error('Nessun utente autenticato.')
      return api.createProfile(userId, username, avatarFile, null)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data)
    },
  })
}

// Cambia la foto profilo dopo la creazione del profilo (la vecchia viene
// rimossa dopo, vedi updateAvatar in lib/supabaseDataApi.ts).
export function useUpdateAvatar(userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<Profile, PostgrestError | Error, File>({
    mutationFn: async (file) => {
      if (!userId) throw new Error('Nessun utente autenticato.')
      const previousUrl = queryClient.getQueryData<Profile | null>(profileQueryKey(userId))?.avatar_url
      return api.updateAvatar(userId, file, previousUrl)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data)
      // Avatar mostrati in chat e in Info camera arrivano dalla lista membri.
      queryClient.invalidateQueries({ queryKey: ['room-members'] })
    },
  })
}

// Segna il tutorial di benvenuto come visto (una volta per persona, vedi
// migrazione 20260925120000). Aggiorna subito la cache del profilo così il
// tutorial non ricompare nemmeno se la richiesta è ancora in volo.
export function useMarkTutorialSeen(userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('Nessun utente autenticato.')
      const seenAt = new Date().toISOString()
      queryClient.setQueryData<Profile | null>(profileQueryKey(userId), (profile) =>
        profile ? { ...profile, tutorial_seen_at: seenAt } : profile,
      )
      await api.markTutorialSeen(userId, seenAt)
    },
  })
}
