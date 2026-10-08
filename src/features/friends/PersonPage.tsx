import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { BackIcon } from '../../components/icons'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useRoomMembers } from '../rooms/useRoomDetail'
import {
  useAcceptFriendRequest,
  useDeleteFriendRequest,
  useFriendRequests,
  useFriends,
  useOpenDirectChat,
  useSendFriendRequestToUser,
  useSharedRooms,
} from './useFriends'

const SEND_RESULT_TEXT = {
  sent: 'Richiesta inviata: ora deve accettarla.',
  accepted: 'Ti aveva già mandato una richiesta: ora siete amici!',
  already_friends: 'Siete già amici.',
  already_sent: 'Avevi già mandato una richiesta: è ancora in attesa.',
} as const

// Scheda di una persona, aperta toccando nome o foto in una camera di
// gruppo (o dall'elenco dei membri): chi è, camere in comune, amicizia e
// chat privata. Nome e foto vengono dai membri della camera, così vale
// anche nel tour e nella demo.
export function PersonPage() {
  const { roomId, userId: personId } = useParams<{ roomId: string; userId: string }>()
  const { session } = useAuthStatus()
  const userId = session?.user.id
  const isMe = personId === userId

  const membersQuery = useRoomMembers(roomId)
  const sharedRoomsQuery = useSharedRooms(isMe ? undefined : personId)
  const friendsQuery = useFriends(userId)
  const requestsQuery = useFriendRequests(userId)
  const sendRequest = useSendFriendRequestToUser(userId)
  const acceptRequest = useAcceptFriendRequest(userId)
  const deleteRequest = useDeleteFriendRequest(userId)
  const openDirectChat = useOpenDirectChat()

  const member = membersQuery.data?.find((row) => row.user_id === personId)
  const name = member?.AAA3_profiles?.username ?? '(profilo sconosciuto)'
  const isFriend = friendsQuery.data?.some((friend) => friend.userId === personId) ?? false
  const incoming = requestsQuery.data?.incoming.find((request) => request.person.userId === personId)
  const outgoing = requestsQuery.data?.outgoing.find((request) => request.person.userId === personId)
  const friendshipLoaded = Boolean(friendsQuery.data && requestsQuery.data)

  return (
    <>
      <header className="page-header">
        <Link to={`/rooms/${roomId}`} className="icon-btn" aria-label="Torna alla camera">
          <BackIcon />
        </Link>
        <div className="title">
          <h1>{membersQuery.isPending ? '…' : name}</h1>
          {isMe && <small>Sei tu</small>}
        </div>
      </header>

      <section className="page-body">
        {membersQuery.isError && <p role="alert">Errore nel caricamento della persona.</p>}
        {membersQuery.data && !member && (
          <p className="muted">Questa persona non fa più parte della camera.</p>
        )}

        {member && (
          <div className="person-hero">
            <Avatar url={member.AAA3_profiles?.avatar_url} name={name} size="xl" />
            <b>{name}</b>
            {member.role === 'founder' && <span className="chip accent">Fondatore della camera</span>}
          </div>
        )}

        {member && !isMe && (
          <div className="card">
            <span className="section-label">Amicizia</span>
            {!friendshipLoaded && <p className="muted">Caricamento…</p>}
            {friendshipLoaded && isFriend && <p className="muted small">Siete amici.</p>}
            {friendshipLoaded && !isFriend && incoming && (
              <>
                <p className="muted small">{name} ti ha mandato una richiesta di amicizia.</p>
                <div className="row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => acceptRequest.mutate(incoming.id)}
                    disabled={acceptRequest.isPending}
                  >
                    Accetta
                  </button>
                  <button
                    type="button"
                    className="btn-link danger"
                    onClick={() => deleteRequest.mutate(incoming.id)}
                    disabled={deleteRequest.isPending}
                  >
                    Rifiuta
                  </button>
                </div>
              </>
            )}
            {friendshipLoaded && !isFriend && !incoming && outgoing && (
              <div className="row spread">
                <p className="muted small">Richiesta inviata, in attesa che la accetti.</p>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => deleteRequest.mutate(outgoing.id)}
                  disabled={deleteRequest.isPending}
                >
                  Annulla
                </button>
              </div>
            )}
            {friendshipLoaded && !isFriend && !incoming && !outgoing && (
              <>
                <p className="muted small">Non siete ancora amici. Puoi mandare una richiesta anche senza codice.</p>
                <button
                  type="button"
                  onClick={() => personId && sendRequest.mutate(personId)}
                  disabled={sendRequest.isPending}
                >
                  Invia richiesta di amicizia
                </button>
              </>
            )}
            {sendRequest.data && <p role="status">{SEND_RESULT_TEXT[sendRequest.data]}</p>}
            {sendRequest.isError && <p role="alert">{sendRequest.error.message}</p>}
            {acceptRequest.isError && <p role="alert">{acceptRequest.error.message}</p>}
            {deleteRequest.isError && <p role="alert">{deleteRequest.error.message}</p>}
          </div>
        )}

        {member && !isMe && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => personId && openDirectChat.mutate(personId)}
            disabled={openDirectChat.isPending}
          >
            Scrivi in privato
          </button>
        )}
        {openDirectChat.isError && <p role="alert">{openDirectChat.error.message}</p>}

        {member && !isMe && sharedRoomsQuery.data && sharedRoomsQuery.data.length > 0 && (
          <div className="card">
            <span className="section-label">Camere in comune</span>
            {sharedRoomsQuery.data.map((room) => (
              <Link key={room.id} to={`/rooms/${room.id}`} className="member">
                <span className="room-tile small" aria-hidden="true">
                  {room.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <b>{room.name}</b>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
