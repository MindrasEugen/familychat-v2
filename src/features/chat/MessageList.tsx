import { useState, type FormEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { getDeviceLang } from '../../lib/deviceLang'
import type { Database } from '../../lib/database.types'
import { PhotoViewer } from './PhotoViewer'
import { usePhotoUrl } from './photoUrls'
import { useDeleteMessage } from './useMessages'
import { useCorrectTranslation, useMessageTranslation } from './useTranslation'

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

export interface MemberInfo {
  username: string | null
  avatarUrl: string | null
}

// Isolata in un sotto-componente così un fallimento su una singola
// immagine (URL scaduto, rete) non rompe il resto della lista dei messaggi.
function MessageImage({ imagePath, onOpen }: { imagePath: string; onOpen: () => void }) {
  const urlQuery = usePhotoUrl(imagePath)

  if (urlQuery.isPending) return <div className="photo-placeholder">Caricamento foto…</div>
  if (urlQuery.isError || !urlQuery.data) {
    return <div className="photo-placeholder">Foto non disponibile.</div>
  }

  return (
    <button type="button" className="photo-thumb" aria-label="Apri foto" onClick={onOpen}>
      <img src={urlQuery.data} alt="Foto in chat" />
    </button>
  )
}

function MessagePhotos({ imagePaths }: { imagePaths: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <div className={imagePaths.length === 1 ? 'bubble-photos single' : 'bubble-photos'}>
        {imagePaths.map((imagePath, index) => (
          <MessageImage key={imagePath} imagePath={imagePath} onOpen={() => setOpenIndex(index)} />
        ))}
      </div>
      {openIndex !== null && (
        <PhotoViewer imagePaths={imagePaths} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  )
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
      <p>{isTranslated ? translated : body}</p>
      {translationQuery.data && !isCorrecting && (
        // Pillola verde solo se il testo è davvero tradotto; altrimenti
        // (stessa lingua, o eco) resta solo il link discreto per correggere.
        <span className={isTranslated ? 'translated' : 'translated plain'}>
          {isTranslated && <span title="Messaggio tradotto automaticamente">Tradotto</span>}
          <button type="button" className="btn-link" onClick={startCorrecting}>
            {isTranslated ? 'Correggi' : 'Correggi traduzione'}
          </button>
        </span>
      )}
      {correctTranslation.isError && <span role="alert">{correctTranslation.error.message}</span>}
      {isCorrecting && (
        <form onSubmit={handleCorrectionSubmit} className="correction-form">
          <input
            type="text"
            aria-label="Traduzione corretta"
            value={correctionText}
            onChange={(event) => setCorrectionText(event.target.value)}
          />
          <div className="row">
            <button type="submit" disabled={correctTranslation.isPending}>
              Salva
            </button>
            <button type="button" className="btn-link" onClick={() => setIsCorrecting(false)}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageList({
  messages,
  membersById,
  currentUserId,
  isFounder,
  roomId,
}: {
  messages: Message[]
  membersById: Map<string, MemberInfo>
  currentUserId: string | undefined
  isFounder: boolean
  roomId: string | undefined
}) {
  const deleteMessage = useDeleteMessage(roomId)

  if (messages.length === 0) {
    return <p className="muted center">Nessun messaggio ancora — scrivi il primo.</p>
  }

  return (
    <ul className="message-list">
      {messages.map((message) => {
        const isMine = message.sender_id === currentUserId
        const sender = membersById.get(message.sender_id)
        const senderName = sender?.username ?? '(sconosciuto)'

        return (
          <li key={message.id} className={isMine ? 'msg mine' : 'msg'}>
            {!isMine && <Avatar url={sender?.avatarUrl} name={sender?.username} size="sm" />}
            <div className="bubble">
              {!isMine && <span className="who">{senderName}</span>}
              {message.image_paths.length > 0 && <MessagePhotos imagePaths={message.image_paths} />}
              {message.body && <MessageBody body={message.body} currentUserId={currentUserId} />}
              <div className="bubble-foot">
                {(isMine || isFounder) && (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() =>
                      deleteMessage.mutate({
                        id: message.id,
                        imagePaths: message.image_paths,
                      })
                    }
                    disabled={deleteMessage.isPending}
                  >
                    Elimina
                  </button>
                )}
                <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
