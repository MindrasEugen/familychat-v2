import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useDisablePush, useEnablePush, usePushSubscriptionStatus } from '../notifications/usePushSubscription'
import { useCreateRoom, useJoinRoom, useRooms } from './useRooms'

function PushToggle({ userId }: { userId: string | undefined }) {
  const statusQuery = usePushSubscriptionStatus()
  const enablePush = useEnablePush(userId)
  const disablePush = useDisablePush()

  if (statusQuery.data === 'unsupported' || !statusQuery.data) return null

  if (statusQuery.data === 'subscribed') {
    return (
      <p>
        <button type="button" onClick={() => disablePush.mutate()} disabled={disablePush.isPending}>
          Disattiva notifiche push
        </button>
        {disablePush.isError && <span role="alert"> {disablePush.error.message}</span>}
      </p>
    )
  }

  return (
    <p>
      <button type="button" onClick={() => enablePush.mutate()} disabled={enablePush.isPending}>
        Attiva notifiche push
      </button>
      {enablePush.isError && <span role="alert"> {enablePush.error.message}</span>}
    </p>
  )
}

export function RoomsListPage() {
  const { session } = useAuthStatus()
  const userId = session?.user.id

  const roomsQuery = useRooms(userId)
  const createRoom = useCreateRoom(userId)
  const joinRoom = useJoinRoom(userId)

  const [roomName, setRoomName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  function handleCreateRoom(event: FormEvent) {
    event.preventDefault()
    const trimmed = roomName.trim()
    if (!trimmed) return
    createRoom.mutate(trimmed, { onSuccess: () => setRoomName('') })
  }

  function handleJoinRoom(event: FormEvent) {
    event.preventDefault()
    const trimmed = inviteCode.trim()
    if (!trimmed) return
    joinRoom.mutate(trimmed, { onSuccess: () => setInviteCode('') })
  }

  return (
    <section>
      <h1>Le tue camere</h1>

      <PushToggle userId={userId} />

      {roomsQuery.isPending && <p>Caricamento…</p>}
      {roomsQuery.isError && <p role="alert">Errore nel caricamento delle camere.</p>}
      {roomsQuery.data && roomsQuery.data.length === 0 && (
        <p>Non fai ancora parte di nessuna camera: creane una o unisciti con un codice invito.</p>
      )}
      {roomsQuery.data && roomsQuery.data.length > 0 && (
        <ul>
          {roomsQuery.data.map((room) => (
            <li key={room.id}>
              <Link to={`/rooms/${room.id}`}>{room.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreateRoom}>
        <label>
          Nuova camera
          <input
            type="text"
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            placeholder="Nome della camera"
          />
        </label>
        <button type="submit" disabled={createRoom.isPending}>
          Crea
        </button>
        {createRoom.isError && <p role="alert">{createRoom.error.message}</p>}
      </form>

      <form onSubmit={handleJoinRoom}>
        <label>
          Codice invito
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Codice ricevuto da un membro"
          />
        </label>
        <button type="submit" disabled={joinRoom.isPending}>
          Unisciti
        </button>
        {joinRoom.isError && <p role="alert">{joinRoom.error.message}</p>}
      </form>
    </section>
  )
}
