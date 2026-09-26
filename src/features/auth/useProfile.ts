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

async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Stesso fallback delle foto in chat: se la compressione fallisce
  // carichiamo il file originale invece di bloccare il salvataggio.
  const compressed = await compressImage(file)
  const toUpload = compressed ?? file
  const ext = compressed ? 'jpg' : fileExtension(file)
  const contentType = compressed ? 'image/jpeg' : file.type || 'application/octet-stream'
  // Path "<user_id>/<file>": le policy RLS sul bucket (pubblico in
  // lettura) verificano il primo segmento per limitare la scrittura
  // al proprio utente. Un nome nuovo a ogni caricamento: l'URL cambia,
  // quindi nessuna cache del browser mostra la foto vecchia.
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(path, toUpload, { contentType })
  if (uploadError) throw uploadError
  return supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

// Path nel bucket di una foto profilo a partire dal suo URL pubblico, solo
// se appartiene a questo utente (mai cancellare file altrui o URL esterni).
function ownAvatarPath(userId: string, avatarUrl: string | null | undefined): string | null {
  const marker = `/object/public/${PROFILE_PHOTO_BUCKET}/`
  const index = avatarUrl?.indexOf(marker) ?? -1
  if (!avatarUrl || index === -1) return null
  const path = decodeURIComponent(avatarUrl.slice(index + marker.length))
  return path.startsWith(`${userId}/`) ? path : null
}

export function useCompleteProfile(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Profile, PostgrestError | Error, { username: string; avatarFile: File | null }>({
    mutationFn: async ({ username, avatarFile }) => {
      if (!userId) throw new Error('Nessun utente autenticato.')

      const avatarUrl = avatarFile ? await uploadAvatar(userId, avatarFile) : null

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

// Cambia la foto profilo dopo la creazione del profilo. La foto vecchia
// viene rimossa dal bucket solo dopo che il profilo punta già a quella
// nuova, e senza mai far fallire il cambio se la rimozione non riesce.
export function useUpdateAvatar(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<Profile, PostgrestError | Error, File>({
    mutationFn: async (file) => {
      if (!userId) throw new Error('Nessun utente autenticato.')

      const previousUrl = queryClient.getQueryData<Profile | null>(profileQueryKey(userId))?.avatar_url
      const avatarUrl = await uploadAvatar(userId, file)

      const { data, error } = await supabase
        .from('AAA3_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error

      const oldPath = ownAvatarPath(userId, previousUrl)
      if (oldPath) {
        await supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .remove([oldPath])
          .catch(() => {})
      }
      return data
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
