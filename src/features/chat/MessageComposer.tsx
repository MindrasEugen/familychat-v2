import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { PhotoIcon, SendIcon } from '../../components/icons'
import { MAX_PHOTOS_PER_MESSAGE, useSendMessage } from './useMessages'

export function MessageComposer({
  roomId,
  userId,
}: {
  roomId: string | undefined
  userId: string | undefined
}) {
  const sendMessage = useSendMessage(roomId, userId)
  const [body, setBody] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [tooManyMessage, setTooManyMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewUrls = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles])

  // Gli object URL delle anteprime vanno revocati quando la selezione
  // cambia/si svuota o quando il componente si smonta, altrimenti restano
  // in memoria.
  useEffect(() => {
    return () => {
      for (const url of previewUrls) URL.revokeObjectURL(url)
    }
  }, [previewUrls])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    if (selected.length > MAX_PHOTOS_PER_MESSAGE) {
      setTooManyMessage(
        `Puoi allegare al massimo ${MAX_PHOTOS_PER_MESSAGE} foto per messaggio — le altre sono state ignorate.`,
      )
    } else {
      setTooManyMessage(null)
    }
    setImageFiles(selected.slice(0, MAX_PHOTOS_PER_MESSAGE))
  }

  function clearPhotoSelection() {
    setImageFiles([])
    setTooManyMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed && imageFiles.length === 0) return
    sendMessage.mutate(
      { body: trimmed, imageFiles },
      {
        onSuccess: () => {
          setBody('')
          clearPhotoSelection()
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="composer">
      {tooManyMessage && <p role="alert">{tooManyMessage}</p>}
      {sendMessage.isError && <p role="alert">{sendMessage.error.message}</p>}
      {previewUrls.length > 0 && (
        <div className="photo-previews">
          {previewUrls.map((url) => (
            <img key={url} src={url} alt="Anteprima foto selezionata" />
          ))}
          <button
            type="button"
            className="btn-link"
            onClick={clearPhotoSelection}
            disabled={sendMessage.isPending}
          >
            Rimuovi foto
          </button>
        </div>
      )}
      <div className="composer-row">
        {/* Il vero input file è nascosto: il click sull'icona lo apre (è
            dentro la label), e resta raggiungibile da tastiera. */}
        <label className="icon-btn photo-picker" title={`Allega foto (fino a ${MAX_PHOTOS_PER_MESSAGE})`}>
          <PhotoIcon />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            aria-label={`Allega foto (fino a ${MAX_PHOTOS_PER_MESSAGE})`}
            onChange={handleFileChange}
            disabled={sendMessage.isPending}
          />
        </label>
        <input
          type="text"
          aria-label="Messaggio"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Scrivi un messaggio"
          disabled={sendMessage.isPending}
        />
        <button type="submit" className="send-btn" aria-label="Invia" disabled={sendMessage.isPending}>
          <SendIcon />
        </button>
      </div>
    </form>
  )
}
