import { useParams } from 'react-router-dom'

// TODO: cronologia messaggi via TanStack Query (merge per id + ordinamento,
// mai svuotare/ripopolare la lista con una sottoscrizione realtime attiva —
// vedi PROMPT_REACT_REWRITE.md lezione 10), invio testo/foto, traduzione
// automatica inline, correzione traduzione dalla chat.
export function RoomChatPage() {
  const { roomId } = useParams<{ roomId: string }>()

  return (
    <section>
      <h1>Chat camera {roomId}</h1>
      <p>Placeholder — cronologia messaggi e invio da implementare.</p>
    </section>
  )
}
