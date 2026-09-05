import type { Database } from '../../lib/database.types'

type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']

export function MessageList({
  messages,
  usernamesById,
  currentUserId,
}: {
  messages: Message[]
  usernamesById: Map<string, string>
  currentUserId: string | undefined
}) {
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
          : {message.body}
        </li>
      ))}
    </ul>
  )
}
