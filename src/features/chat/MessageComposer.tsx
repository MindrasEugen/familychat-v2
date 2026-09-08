import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
    <form onSubmit={handleSubmit}>
      <label>
        Messaggio
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Scrivi un messaggio"
          disabled={sendMessage.isPending}
        />
      </label>
      <label>
        Foto (fino a {MAX_PHOTOS_PER_MESSAGE})
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={sendMessage.isPending}
        />
      </label>
      {tooManyMessage && <p role="alert">{tooManyMessage}</p>}
      {previewUrls.length > 0 && (
        <p>
          {previewUrls.map((url) => (
            <img key={url} src={url} alt="Anteprima foto selezionata" style={{ maxWidth: 120, marginRight: 4 }} />
          ))}
          <button type="button" onClick={clearPhotoSelection} disabled={sendMessage.isPending}>
            Rimuovi foto
          </button>
        </p>
      )}
      <button type="submit" disabled={sendMessage.isPending}>
        Invia
      </button>
      {sendMessage.isError && <p role="alert">{sendMessage.error.message}</p>}
    </form>
  )
}
