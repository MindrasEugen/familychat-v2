import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataApi } from '../../lib/dataApi'
import type { CorrectTranslationInput, TranslationResult } from '../../lib/supabaseDataApi'

function hasLetters(text: string) {
  return /\p{L}/u.test(text)
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

export function translationQueryKey(text: string, targetLang: string) {
  return ['translation', normalize(text), targetLang] as const
}

// Traduzione automatica di un messaggio nella lingua del lettore: prima la
// memoria condivisa, poi la Edge Function (vedi translate in
// lib/supabaseDataApi.ts). Una correzione manuale (useCorrectTranslation)
// ha sempre la priorità.
export function useMessageTranslation(text: string | null, targetLang: string) {
  const trimmed = text?.trim() ?? ''
  const api = useDataApi()

  return useQuery({
    queryKey: translationQueryKey(trimmed, targetLang),
    queryFn: async (): Promise<TranslationResult> => {
      // Solo emoji/punteggiatura/numeri: niente da tradurre, e niente
      // lettura della cache (contiene ancora vecchie voci di Mistral come
      // 😘 → "Ti amo"). Il testo identico non viene mostrato come tradotto.
      if (!hasLetters(trimmed)) return { translatedText: trimmed, sourceLang: 'und' }
      return api.translate(trimmed, targetLang)
    },
    enabled: trimmed.length > 0,
    staleTime: Infinity, // il testo di un messaggio non cambia mai una volta inviato
  })
}

export function useCorrectTranslation() {
  const queryClient = useQueryClient()
  const api = useDataApi()

  return useMutation<void, Error, CorrectTranslationInput>({
    mutationFn: (input) => api.correctTranslation(input),
    onSuccess: (_, { sourceText, sourceLang, targetLang, correctedText }) => {
      queryClient.setQueryData(translationQueryKey(sourceText, targetLang), {
        translatedText: correctedText.trim(),
        sourceLang,
      })
    },
  })
}
