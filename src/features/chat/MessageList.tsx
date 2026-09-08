import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { getDeviceLang } from '../../lib/deviceLang'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'
import { useDeleteMessage } from './useMessages'
import { useCorrectTranslation, useMessageTranslation } from './useTranslation'

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

const SIGNED_URL_TTL_SECONDS = 3600

// Bucket "room-photos" privato: niente getPublicUrl, serve un signed URL per
// ogni foto. Isolato in un sotto-componente così un fallimento su una singola
// immagine (URL scaduto, rete) non rompe il resto della lista dei messaggi.
function MessageImage({ imagePath }: { imagePath: string }) {
  const signedUrlQuery = useQuery({
    queryKey: ['message-photo-signed-url', imagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('room-photos')
        .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS)
      if (error) throw error
      return data.signedUrl
    },
    staleTime: (SIGNED_URL_TTL_SECONDS / 2) * 1000,
  })

  if (signedUrlQuery.isPending) return <p>Caricamento foto…</p>
  if (signedUrlQuery.isError || !signedUrlQuery.data) return <p>Foto non disponibile.</p>

  return <img src={signedUrlQuery.data} alt="Foto in chat" style={{ maxWidth: 300 }} />
}

// Traduzione automatica nella lingua del dispositivo di chi legge (stessa
// euristica di v1) + correzione manuale, isolata dal resto del messaggio:
// un fallimento sulla traduzione di UN messaggio non deve mai impedire di
// leggere il testo originale, mostrato comunque come fallback.
function MessageBody({ body, currentUserId }: { body: string; currentUserId: string | undefined }) {
  const targetLang = getDeviceLang()
  const translationQuery = useMessageTranslation(body, targetLang)
  const correctTranslation = useCorrectTranslation()
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [correctionText, setCorrectionText] = useState('')

  const translated = translationQuery.data?.translatedText
  // Un "eco" (traduzione tornata identica all'originale) non va mostrato
  // come tradotto — coerente con la lezione 4: può essere un fallimento
  // silenzioso del servizio, l'utente deve vedere il testo originale, non
  // un falso badge "tradotto".
  const isTranslated = Boolean(translated) && translated!.trim().toLowerCase() !== body.trim().toLowerCase()

  function startCorrecting() {
    setCorrectionText(translated ?? body)
    setIsCorrecting(true)
  }

  function handleCorrectionSubmit(event: FormEvent) {
    event.preventDefault()
    if (!currentUserId || !translationQuery.data || !correctionText.trim()) return
    correctTranslation.mutate(
      {
        sourceText: body,
        sourceLang: translationQuery.data.sourceLang,
        targetLang,
        correctedText: correctionText,
        userId: currentUserId,
      },
      { onSuccess: () => setIsCorrecting(false) },
    )
  }

  return (
    <>
      : {isTranslated ? translated : body}
      {isTranslated && (
        <span title="Messaggio tradotto automaticamente" style={{ marginLeft: '0.25em' }}>
          🌐
        </span>
      )}
      {translationQuery.data && !isCorrecting && (
        <button type="button" onClick={startCorrecting} style={{ marginLeft: '0.5em' }}>
          Correggi traduzione
        </button>
      )}
      {correctTranslation.isError && <span role="alert"> {correctTranslation.error.message}</span>}
      {isCorrecting && (
        <form onSubmit={handleCorrectionSubmit} style={{ display: 'inline-block', marginLeft: '0.5em' }}>
          <input
            type="text"
            value={correctionText}
            onChange={(event) => setCorrectionText(event.target.value)}
          />
          <button type="submit" disabled={correctTranslation.isPending}>
            Salva
          </button>
          <button type="button" onClick={() => setIsCorrecting(false)}>
            Annulla
          </button>
        </form>
      )}
    </>
  )
}

export function MessageList({
  messages,
  usernamesById,
  currentUserId,
  isFounder,
  roomId,
}: {
  messages: Message[]
  usernamesById: Map<string, string>
  currentUserId: string | undefined
  isFounder: boolean
  roomId: string | undefined
}) {
  const deleteMessage = useDeleteMessage(roomId)

  if (messages.length === 0) {
    return <p>Nessun messaggio ancora — scrivi il primo.</p>
  }

  return (
    <ul>
      {messages.map((message) => (
        <li key={message.id}>
          <strong>
            {message.sender_id === currentUserId
              ? 'Tu'
              : (usernamesById.get(message.sender_id) ?? '(sconosciuto)')}
          </strong>
          {message.body && <MessageBody body={message.body} currentUserId={currentUserId} />}
          {message.image_paths.map((imagePath) => (
            <MessageImage key={imagePath} imagePath={imagePath} />
          ))}
          {(message.sender_id === currentUserId || isFounder) && (
            <button
              type="button"
              onClick={() =>
                deleteMessage.mutate({
                  id: message.id,
                  imagePaths: message.image_paths,
                })
              }
              disabled={deleteMessage.isPending}
              style={{ marginLeft: '0.5em' }}
            >
              Elimina
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
