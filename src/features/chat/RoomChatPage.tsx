import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useDeleteRoom, useLeaveRoom, useRemoveMember, useRoom, useRoomMembers } from '../rooms/useRoomDetail'
import { useCreateRoomInvite, useRevokeRoomInvite, useRoomInvites } from '../rooms/useRoomInvites'
import { MessageComposer } from './MessageComposer'
import { MessageList } from './MessageList'
import { MESSAGES_PAGE_SIZE, useLoadOlderMessages, useMessages, useRoomMessagesRealtime } from './useMessages'

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
  const navigate = useNavigate()

  const roomQuery = useRoom(roomId)
  const membersQuery = useRoomMembers(roomId)
  const createInvite = useCreateRoomInvite(roomId, userId)
  const messagesQuery = useMessages(roomId)
  const loadOlderMessages = useLoadOlderMessages(roomId)
  const [noMoreOlderMessages, setNoMoreOlderMessages] = useState(false)
  const leaveRoom = useLeaveRoom(roomId, userId)
  const removeMember = useRemoveMember(roomId)
  const deleteRoom = useDeleteRoom(userId)
  useRoomMessagesRealtime(roomId)

  const usernamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of membersQuery.data ?? []) {
      if (member.AAA3_profiles?.username) map.set(member.user_id, member.AAA3_profiles.username)
    }
    return map
  }, [membersQuery.data])

  if (roomQuery.isPending) return <p>Caricamento…</p>
  if (roomQuery.isError || !roomQuery.data) {
    return <p role="alert">Camera non trovata, o non ne fai parte.</p>
  }

  const isFounder = roomQuery.data.founder_id === userId

  return (
    <section>
      <h1>{roomQuery.data.name}</h1>
      {isFounder && <p>Sei il fondatore di questa camera.</p>}

      {isFounder ? (
        <button
          type="button"
          onClick={() => deleteRoom.mutate(roomId as string, { onSuccess: () => navigate('/rooms') })}
          disabled={deleteRoom.isPending}
        >
          Elimina camera
        </button>
      ) : (
        <button
          type="button"
          onClick={() => leaveRoom.mutate(undefined, { onSuccess: () => navigate('/rooms') })}
          disabled={leaveRoom.isPending}
        >
          Esci dalla camera
        </button>
      )}
      {deleteRoom.isError && <p role="alert">{deleteRoom.error.message}</p>}
      {leaveRoom.isError && <p role="alert">{leaveRoom.error.message}</p>}

      <h2>Membri</h2>
      {membersQuery.isPending && <p>Caricamento…</p>}
      {membersQuery.isError && <p role="alert">Errore nel caricamento dei membri.</p>}
      {membersQuery.data && (
        <ul>
          {membersQuery.data.map((member) => (
            <li key={member.user_id}>
              {member.AAA3_profiles?.avatar_url && (
                <img
                  src={member.AAA3_profiles.avatar_url}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: '50%' }}
                />
              )}{' '}
              {member.AAA3_profiles?.username ?? '(profilo sconosciuto)'} — {member.role}
              {isFounder && member.user_id !== userId && (
                <button
                  type="button"
                  onClick={() => removeMember.mutate(member.user_id)}
                  disabled={removeMember.isPending}
                >
                  Rimuovi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {removeMember.isError && <p role="alert">{removeMember.error.message}</p>}

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

      <h2>Messaggi</h2>
      {messagesQuery.isPending && <p>Caricamento…</p>}
      {messagesQuery.isError && <p role="alert">Errore nel caricamento dei messaggi.</p>}
      {messagesQuery.data && messagesQuery.data.length > 0 && !noMoreOlderMessages && (
        <button
          type="button"
          onClick={() =>
            loadOlderMessages.mutate(undefined, {
              onSuccess: (fetchedCount) => {
                if (fetchedCount < MESSAGES_PAGE_SIZE) setNoMoreOlderMessages(true)
              },
            })
          }
          disabled={loadOlderMessages.isPending}
        >
          Carica messaggi precedenti
        </button>
      )}
      {loadOlderMessages.isError && <p role="alert">{loadOlderMessages.error.message}</p>}
      {noMoreOlderMessages && <p>Inizio della cronologia.</p>}
      {messagesQuery.data && (
        <MessageList
          messages={messagesQuery.data}
          usernamesById={usernamesById}
          currentUserId={userId}
          isFounder={isFounder}
          roomId={roomId}
        />
      )}
      <MessageComposer roomId={roomId} userId={userId} />
    </section>
  )
}
