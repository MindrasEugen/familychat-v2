import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { CloseIcon } from '../../components/icons'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useCanSendInRoom, useFriends, useOpenDirectChat, useRemoveFriend } from '../friends/useFriends'
import {
  useDeleteRoom,
  useLeaveRoom,
  useRemoveMember,
  useRoom,
  useRoomMembers,
  useSetRoomNotificationsMuted,
} from './useRoomDetail'
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
  const setMuted = useSetRoomNotificationsMuted(roomId, userId)
  const openDirectChat = useOpenDirectChat()
  const isDirect = roomQuery.data?.kind === 'direct'
  const friendsQuery = useFriends(isDirect ? userId : undefined)
  const removeFriend = useRemoveFriend(userId)
  const canSendQuery = useCanSendInRoom(roomId, isDirect)
  // Conferma in linea prima di togliere l'amicizia, come nella pagina Amici.
  const [confirmRemoveFriend, setConfirmRemoveFriend] = useState(false)

  if (roomQuery.isPending) return <p className="muted page-note">Caricamento…</p>
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <p role="alert" className="page-note">
        Camera non trovata, o non ne fai parte.
      </p>
    )
  }

  const isFounder = !isDirect && roomQuery.data.founder_id === userId
  const myMembership = membersQuery.data?.find((member) => member.user_id === userId)
  const notificationsOn = myMembership ? !myMembership.notifications_muted : undefined

  const notificationsCard = notificationsOn !== undefined && (
    <div className="card">
      <div className="row spread">
        <div>
          <span className="section-label">{isDirect ? 'Notifiche di questa chat' : 'Notifiche di questa camera'}</span>
          <p className="muted small">
            {notificationsOn
              ? 'Ricevi una notifica per ogni nuovo messaggio.'
              : isDirect
                ? 'Silenziata: nessuna notifica da questa chat.'
                : 'Silenziata: nessuna notifica da questa camera.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={notificationsOn}
          aria-label={isDirect ? 'Notifiche di questa chat' : 'Notifiche di questa camera'}
          className="switch"
          onClick={() => setMuted.mutate(notificationsOn)}
          disabled={setMuted.isPending}
        >
          <span className="switch-thumb" />
        </button>
      </div>
      {setMuted.isError && <p role="alert">{setMuted.error.message}</p>}
    </div>
  )

  // Chat privata: niente membri, inviti, uscita o eliminazione (la coppia
  // resta, al più in sola lettura). Si può togliere l'amicizia da qui.
  if (isDirect) {
    const other = membersQuery.data?.find((member) => member.user_id !== userId)
    const isFriend = Boolean(other && friendsQuery.data?.some((friend) => friend.userId === other.user_id))
    return (
      <>
        <header className="page-header">
          <Link to={`/rooms/${roomId}`} className="icon-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <Avatar url={other?.AAA3_profiles?.avatar_url} name={other?.AAA3_profiles?.username} />
          <div className="title">
            <h1>{other?.AAA3_profiles?.username ?? '…'}</h1>
            <small>Chat privata</small>
          </div>
        </header>

        <section className="page-body">
          {notificationsCard}

          <div className="card">
            <span className="section-label">Amicizia</span>
            {isFriend ? (
              <>
                <p className="muted small">
                  Siete amici. Se togli l'amicizia, la chat resta da rileggere; per scrivervi dovrete essere amici o
                  in una camera insieme.
                </p>
                {confirmRemoveFriend ? (
                  <>
                    <p className="muted small">
                      Togliere {other?.AAA3_profiles?.username ?? 'questa persona'} dagli amici? La chat privata resterà
                      da rileggere.
                    </p>
                    <div className="row">
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() =>
                          other &&
                          removeFriend.mutate(other.user_id, { onSuccess: () => setConfirmRemoveFriend(false) })
                        }
                        disabled={removeFriend.isPending}
                      >
                        Togli
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setConfirmRemoveFriend(false)}
                        disabled={removeFriend.isPending}
                      >
                        Annulla
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn-danger" onClick={() => setConfirmRemoveFriend(true)}>
                    Togli dagli amici
                  </button>
                )}
              </>
            ) : (
              <p className="muted small">
                {canSendQuery.data === false
                  ? 'Non siete amici né in una camera insieme: la chat è di sola lettura. Per scrivervi di nuovo, aggiungetevi agli amici con il codice amico.'
                  : 'Non siete amici, ma siete in una camera insieme: per questo potete scrivervi in privato.'}
              </p>
            )}
            {removeFriend.isError && <p role="alert">{removeFriend.error.message}</p>}
          </div>
        </section>
      </>
    )
  }

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
        {notificationsCard}

        <div className="card">
          <span className="section-label">Membri</span>
          {membersQuery.isPending && <p className="muted">Caricamento…</p>}
          {membersQuery.isError && <p role="alert">Errore nel caricamento dei membri.</p>}
          {membersQuery.data?.map((member) => (
            <div key={member.user_id} className="member">
              <Avatar url={member.AAA3_profiles?.avatar_url} name={member.AAA3_profiles?.username} size="sm" />
              <b>
                {/* Nome → scheda della persona (amicizia, chat privata). */}
                {member.user_id === userId ? (
                  `${member.AAA3_profiles?.username ?? '(profilo sconosciuto)'} (tu)`
                ) : (
                  <Link to={`/rooms/${roomId}/people/${member.user_id}`} className="member-link">
                    {member.AAA3_profiles?.username ?? '(profilo sconosciuto)'}
                  </Link>
                )}
              </b>
              {member.role === 'founder' && <span className="chip accent">Fondatore</span>}
              {member.user_id !== userId && (
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => openDirectChat.mutate(member.user_id)}
                  disabled={openDirectChat.isPending}
                >
                  Scrivi
                </button>
              )}
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
          {openDirectChat.isError && <p role="alert">{openDirectChat.error.message}</p>}
        </div>

        <div className="card" data-tour="invites">
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
