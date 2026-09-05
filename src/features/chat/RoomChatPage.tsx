import { useParams } from 'react-router-dom'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useRoom, useRoomMembers } from '../rooms/useRoomDetail'
import { useCreateRoomInvite, useRevokeRoomInvite, useRoomInvites } from '../rooms/useRoomInvites'

function InviteList({ roomId }: { roomId: string }) {
  const invitesQuery = useRoomInvites(roomId)
  const revokeInvite = useRevokeRoomInvite(roomId)

  if (invitesQuery.isPending) return <p>Caricamento inviti…</p>
  if (invitesQuery.isError) return <p role="alert">Errore nel caricamento degli inviti.</p>

  const activeInvites = invitesQuery.data.filter((invite) => !invite.revoked_at)

  if (activeInvites.length === 0) return <p>Nessun invito attivo.</p>

  return (
    <ul>
      {activeInvites.map((invite) => (
        <li key={invite.id}>
          <code>{invite.code}</code>{' '}
          {invite.uses_count > 0 && <span>(già usato)</span>}
          <button
            type="button"
            onClick={() => revokeInvite.mutate(invite.id)}
            disabled={revokeInvite.isPending}
          >
            Revoca
          </button>
        </li>
      ))}
    </ul>
  )
}

export function RoomChatPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { session } = useAuthStatus()
  const userId = session?.user.id

  const roomQuery = useRoom(roomId)
  const membersQuery = useRoomMembers(roomId)
  const createInvite = useCreateRoomInvite(roomId, userId)

  if (roomQuery.isPending) return <p>Caricamento…</p>
  if (roomQuery.isError || !roomQuery.data) {
    return <p role="alert">Camera non trovata, o non ne fai parte.</p>
  }

  const isFounder = roomQuery.data.founder_id === userId

  return (
    <section>
      <h1>{roomQuery.data.name}</h1>
      {isFounder && <p>Sei il fondatore di questa camera.</p>}

      <h2>Membri</h2>
      {membersQuery.isPending && <p>Caricamento…</p>}
      {membersQuery.isError && <p role="alert">Errore nel caricamento dei membri.</p>}
      {membersQuery.data && (
        <ul>
          {membersQuery.data.map((member) => (
            <li key={member.user_id}>
              {member.AAA3_profiles?.username ?? '(profilo sconosciuto)'} — {member.role}
            </li>
          ))}
        </ul>
      )}

      <h2>Inviti</h2>
      <button type="button" onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
        Genera invito
      </button>
      {createInvite.isError && <p role="alert">{createInvite.error.message}</p>}
      {createInvite.isSuccess && (
        <p role="status">
          Nuovo codice: <code>{createInvite.data.code}</code> — condividilo con chi vuoi invitare.
        </p>
      )}
      {roomId && <InviteList roomId={roomId} />}

      <hr />
      <p>Placeholder — cronologia messaggi e invio da implementare.</p>
    </section>
  )
}
