import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { CloseIcon } from '../../components/icons'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useDeleteRoom, useLeaveRoom, useRemoveMember, useRoom, useRoomMembers } from './useRoomDetail'
import { useCreateRoomInvite, useRevokeRoomInvite, useRoomInvites } from './useRoomInvites'

function InviteList({ roomId }: { roomId: string }) {
  const invitesQuery = useRoomInvites(roomId)
  const revokeInvite = useRevokeRoomInvite(roomId)

  if (invitesQuery.isPending) return <p className="muted">Caricamento inviti…</p>
  if (invitesQuery.isError) return <p role="alert">Errore nel caricamento degli inviti.</p>

  const activeInvites = invitesQuery.data.filter((invite) => !invite.revoked_at)

  if (activeInvites.length === 0) return <p className="muted">Nessun invito attivo.</p>

  return (
    <ul className="invite-list">
      {activeInvites.map((invite) => (
        <li key={invite.id} className="invite-code">
          <code>{invite.code}</code>
          {invite.uses_count > 0 && <small>(già usato)</small>}
          <button
            type="button"
            className="btn-link"
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

// Membri, inviti e uscita/eliminazione: separati dalla chat perché si usano
// di rado, e in cima alla chat spingevano i messaggi fuori dallo schermo.
export function RoomInfoPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { session } = useAuthStatus()
  const userId = session?.user.id
  const navigate = useNavigate()

  const roomQuery = useRoom(roomId)
  const membersQuery = useRoomMembers(roomId)
  const createInvite = useCreateRoomInvite(roomId, userId)
  const leaveRoom = useLeaveRoom(roomId, userId)
  const removeMember = useRemoveMember(roomId)
  const deleteRoom = useDeleteRoom(userId)

  if (roomQuery.isPending) return <p className="muted page-note">Caricamento…</p>
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <p role="alert" className="page-note">
        Camera non trovata, o non ne fai parte.
      </p>
    )
  }

  const isFounder = roomQuery.data.founder_id === userId

  return (
    <>
      <header className="page-header">
        <Link to={`/rooms/${roomId}`} className="icon-btn" aria-label="Chiudi">
          <CloseIcon />
        </Link>
        <div className="title">
          <h1>{roomQuery.data.name}</h1>
          {isFounder && <small>Sei il fondatore</small>}
        </div>
      </header>

      <section className="page-body">
        <div className="card">
          <span className="section-label">Membri</span>
          {membersQuery.isPending && <p className="muted">Caricamento…</p>}
          {membersQuery.isError && <p role="alert">Errore nel caricamento dei membri.</p>}
          {membersQuery.data?.map((member) => (
            <div key={member.user_id} className="member">
              <Avatar url={member.AAA3_profiles?.avatar_url} name={member.AAA3_profiles?.username} size="sm" />
              <b>
                {member.AAA3_profiles?.username ?? '(profilo sconosciuto)'}
                {member.user_id === userId && ' (tu)'}
              </b>
              {member.role === 'founder' && <span className="chip accent">Fondatore</span>}
              {isFounder && member.user_id !== userId && (
                <button
                  type="button"
                  className="btn-link danger"
                  onClick={() => removeMember.mutate(member.user_id)}
                  disabled={removeMember.isPending}
                >
                  Rimuovi
                </button>
              )}
            </div>
          ))}
          {removeMember.isError && <p role="alert">{removeMember.error.message}</p>}
        </div>

        <div className="card">
          <span className="section-label">Inviti attivi</span>
          {roomId && <InviteList roomId={roomId} />}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => createInvite.mutate()}
            disabled={createInvite.isPending}
          >
            Genera nuovo invito
          </button>
          {createInvite.isError && <p role="alert">{createInvite.error.message}</p>}
          {createInvite.isSuccess && (
            <p role="status">
              Nuovo codice: <code>{createInvite.data.code}</code> — condividilo con chi vuoi invitare.
            </p>
          )}
        </div>

        {isFounder ? (
          <button
            type="button"
            className="btn-danger"
            onClick={() => deleteRoom.mutate(roomId as string, { onSuccess: () => navigate('/rooms') })}
            disabled={deleteRoom.isPending}
          >
            Elimina camera
          </button>
        ) : (
          <button
            type="button"
            className="btn-danger"
            onClick={() => leaveRoom.mutate(undefined, { onSuccess: () => navigate('/rooms') })}
            disabled={leaveRoom.isPending}
          >
            Esci dalla camera
          </button>
        )}
        {deleteRoom.isError && <p role="alert">{deleteRoom.error.message}</p>}
        {leaveRoom.isError && <p role="alert">{leaveRoom.error.message}</p>}
      </section>
    </>
  )
}
