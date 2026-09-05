import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

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

  return useMutation<Profile, PostgrestError | Error, string>({
    mutationFn: async (username: string) => {
      if (!userId) throw new Error('Nessun utente autenticato.')

      const { data, error } = await supabase
        .from('AAA3_profiles')
        .insert({ id: userId, username: username.trim() })
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
