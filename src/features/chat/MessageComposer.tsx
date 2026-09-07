import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSendMessage } from './useMessages'

export function MessageComposer({
  roomId,
  userId,
}: {
  roomId: string | undefined
  userId: string | undefined
}) {
  const sendMessage = useSendMessage(roomId, userId)
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile])

  // L'object URL dell'anteprima va revocato quando cambia/si svuota la
  // selezione o quando il componente si smonta, altrimenti resta in memoria.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setImageFile(event.target.files?.[0] ?? null)
  }

  function clearPhotoSelection() {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed && !imageFile) return
    sendMessage.mutate(
      { body: trimmed, imageFile },
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
        Foto
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={sendMessage.isPending}
        />
      </label>
      {previewUrl && (
        <p>
          <img src={previewUrl} alt="Anteprima foto selezionata" style={{ maxWidth: 200 }} />
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
