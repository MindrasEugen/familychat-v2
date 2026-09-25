import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { compressImage } from '../../lib/imageCompression'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

const PROFILE_PHOTO_BUCKET = 'profile-photos'

function fileExtension(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name)
  return match ? match[1].toLowerCase() : 'bin'
}

type Profile = Database['public']['Tables']['AAA3_profiles']['Row']

export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('AAA3_profiles')
        .select('*')
        .eq('id', userId as string)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
}

export function useCompleteProfile(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Profile, PostgrestError | Error, { username: string; avatarFile: File | null }>({
    mutationFn: async ({ username, avatarFile }) => {
      if (!userId) throw new Error('Nessun utente autenticato.')

      let avatarUrl: string | null = null
      if (avatarFile) {
        // Stesso fallback delle foto in chat: se la compressione fallisce
        // carichiamo il file originale invece di bloccare la registrazione.
        const compressed = await compressImage(avatarFile)
        const toUpload = compressed ?? avatarFile
        const ext = compressed ? 'jpg' : fileExtension(avatarFile)
        const contentType = compressed ? 'image/jpeg' : avatarFile.type || 'application/octet-stream'
        // Path "<user_id>/<file>": le policy RLS sul bucket (pubblico in
        // lettura) verificano il primo segmento per limitare la scrittura
        // al proprio utente.
        const path = `${userId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .upload(path, toUpload, { contentType })
        if (uploadError) throw uploadError
        avatarUrl = supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
      }

      const { data, error } = await supabase
        .from('AAA3_profiles')
        .insert({ id: userId, username: username.trim(), avatar_url: avatarUrl })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profileQueryKey(userId), data)
    },
  })
}

// Segna il tutorial di benvenuto come visto (una volta per persona, vedi
// migrazione 20260925120000). Aggiorna subito la cache del profilo così il
// tutorial non ricompare nemmeno se la richiesta è ancora in volo.
export function useMarkTutorialSeen(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, PostgrestError | Error, void>({
    mutationFn: async () => {
      if (!userId) throw new Error('Nessun utente autenticato.')
      const seenAt = new Date().toISOString()
      queryClient.setQueryData<Profile | null>(profileQueryKey(userId), (profile) =>
        profile ? { ...profile, tutorial_seen_at: seenAt } : profile,
      )
      const { error } = await supabase.from('AAA3_profiles').update({ tutorial_seen_at: seenAt }).eq('id', userId)
      if (error) throw error
    },
  })
}
