import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

function normalize(text: string) {
  return text.trim().toLowerCase()
}

export function translationQueryKey(text: string, targetLang: string) {
  return ['translation', normalize(text), targetLang] as const
}

interface TranslationResult {
  translatedText: string
  sourceLang: string
}

// Traduzione automatica di un messaggio nella lingua del lettore. Controlla
// prima la memoria condivisa (AAA3_translation_memory, RLS permissiva a
// tutta la famiglia) — solo su un vero cache miss chiama la Edge Function,
// che gestisce l'intera catena di fallback (Google -> Azure -> Mistral) e
// scrive lei stessa in cache. Una correzione manuale (vedi
// useCorrectTranslation) ha sempre la priorità: il lookup ordina per
// corrected_by_user così un'entry corretta vince anche se ne esistesse
// (teoricamente) più di una per lo stesso testo+lingua.
export function useMessageTranslation(text: string | null, targetLang: string) {
  const trimmed = text?.trim() ?? ''

  return useQuery({
    queryKey: translationQueryKey(trimmed, targetLang),
    queryFn: async (): Promise<TranslationResult> => {
      const { data: cached, error: cacheError } = await supabase
        .from('AAA3_translation_memory')
        .select('translated_text, source_lang')
        .eq('source_text_normalized', normalize(trimmed))
        .eq('target_lang', targetLang)
        .order('corrected_by_user', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cacheError) throw cacheError
      if (cached) return { translatedText: cached.translated_text, sourceLang: cached.source_lang }

      const { data, error } = await supabase.functions.invoke<TranslationResult>('translate-message', {
        body: { text: trimmed, targetLang },
      })
      if (error) throw error
      if (!data) throw new Error('Nessuna traduzione ricevuta.')
      return data
    },
    enabled: trimmed.length > 0,
    staleTime: Infinity, // il testo di un messaggio non cambia mai una volta inviato
  })
}

export function useCorrectTranslation() {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { sourceText: string; sourceLang: string; targetLang: string; correctedText: string; userId: string }
  >({
    mutationFn: async ({ sourceText, sourceLang, targetLang, correctedText, userId }) => {
      const { error } = await supabase.from('AAA3_translation_memory').upsert(
        {
          source_text: sourceText,
          source_lang: sourceLang,
          target_lang: targetLang,
          translated_text: correctedText.trim(),
          provider: 'user',
          corrected_by_user: true,
          corrected_by: userId,
        },
        { onConflict: 'source_text_normalized,source_lang,target_lang' },
      )
      if (error) throw error
    },
    onSuccess: (_, { sourceText, sourceLang, targetLang, correctedText }) => {
      queryClient.setQueryData(translationQueryKey(sourceText, targetLang), {
        translatedText: correctedText.trim(),
        sourceLang,
      })
    },
  })
}
