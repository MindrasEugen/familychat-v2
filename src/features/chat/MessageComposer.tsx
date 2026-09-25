import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { CameraIcon, PhotoIcon, SendIcon } from '../../components/icons'
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

  const previewUrls = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles])

  // Gli object URL delle anteprime vanno revocati quando la selezione
  // cambia/si svuota o quando il componente si smonta, altrimenti restano
  // in memoria.
  useEffect(() => {
    return () => {
      for (const url of previewUrls) URL.revokeObjectURL(url)
    }
  }, [previewUrls])

  // Galleria e fotocamera si sommano (es. due scatti + tre foto dalla
  // galleria), sempre entro il tetto per messaggio: le eccedenti si scartano
  // subito, prima di qualunque upload.
  function addPhotos(added: File[]) {
    const combined = [...imageFiles, ...added]
    if (combined.length > MAX_PHOTOS_PER_MESSAGE) {
      setTooManyMessage(
        `Puoi allegare al massimo ${MAX_PHOTOS_PER_MESSAGE} foto per messaggio — le altre sono state ignorate.`,
      )
    } else {
      setTooManyMessage(null)
    }
    setImageFiles(combined.slice(0, MAX_PHOTOS_PER_MESSAGE))
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addPhotos(Array.from(event.target.files ?? []))
    event.target.value = '' // permette di riscegliere gli stessi file dopo "Rimuovi foto"
  }

  // Fotocamera: una foto per scatto; si possono scattare più foto di fila
  // prima di inviare.
  function handleCameraChange(event: ChangeEvent<HTMLInputElement>) {
    const shot = event.target.files?.[0]
    event.target.value = ''
    if (shot) addPhotos([shot])
  }

  function clearPhotoSelection() {
    setImageFiles([])
    setTooManyMessage(null)
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
        {/* I veri input file sono nascosti: il click sull'icona li apre (sono
            dentro la label), e restano raggiungibili da tastiera. Due input
            separati come in v1: con `multiple` molti browser Android (Brave
            sempre) aprono solo la galleria, senza fotocamera. `capture` la
            apre direttamente; da PC si comporta come una scelta file. */}
        <label className="icon-btn photo-picker" title="Scatta una foto">
          <CameraIcon />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="visually-hidden"
            aria-label="Scatta una foto"
            onChange={handleCameraChange}
            disabled={sendMessage.isPending}
          />
        </label>
        <label className="icon-btn photo-picker" title={`Allega foto dalla galleria (fino a ${MAX_PHOTOS_PER_MESSAGE})`}>
          <PhotoIcon />
          <input
            type="file"
            accept="image/*"
            multiple
            className="visually-hidden"
            aria-label={`Allega foto dalla galleria (fino a ${MAX_PHOTOS_PER_MESSAGE})`}
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
