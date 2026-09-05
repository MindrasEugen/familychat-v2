import { useState, type FormEvent } from 'react'
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    sendMessage.mutate(trimmed, { onSuccess: () => setBody('') })
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
        />
      </label>
      <button type="submit" disabled={sendMessage.isPending}>
        Invia
      </button>
      {sendMessage.isError && <p role="alert">{sendMessage.error.message}</p>}
    </form>
  )
}
