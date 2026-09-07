import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

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
          {message.body && <>: {message.body}</>}
          {message.image_path && <MessageImage imagePath={message.image_path} />}
        </li>
      ))}
    </ul>
  )
}
