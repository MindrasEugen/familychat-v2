import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { useAuthStatus } from '../auth/useAuthStatus'
import { PushBellButton, PushReminder } from '../notifications/PushControls'
import { useCreateRoom, useJoinRoom, useRooms, type RoomOverview } from './useRooms'

// Anteprima dell'ultimo messaggio, nella lingua originale (tradurre anche
// le anteprime moltiplicherebbe le chiamate al traduttore).
function lastMessagePreview(room: RoomOverview, currentUserId: string | undefined) {
  if (!room.last_message_at) return 'Nessun messaggio ancora'
  const who = room.last_message_sender_id === currentUserId ? 'Tu' : (room.last_message_sender_name ?? 'Qualcuno')
  const photos = room.last_message_photo_count
  const text = room.last_message_body?.trim() || (photos > 1 ? `📷 ${photos} foto` : '📷 Foto')
  return `${who}: ${text}`
}

// Oggi → ora, ieri → "ieri", ultima settimana → giorno, altrimenti data.
function formatRoomTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const time = date.getTime()
  if (time >= startOfToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (time >= startOfToday - dayMs) return 'ieri'
  if (time >= startOfToday - 6 * dayMs) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function RoomsListPage() {
  const { session, profile } = useAuthStatus()
  const userId = session?.user.id
  const [pushError, setPushError] = useState<string | null>(null)
  // Cambiarlo rimonta l'avviso sulle notifiche, che ricompare con il suo
  // timer: la campanella lo usa quando da lì non si può attivare nulla.
  const [reminderKey, setReminderKey] = useState(0)

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

  const roomCount = roomsQuery.data?.length

  return (
    <>
      <header className="page-header">
        <Avatar url={profile?.avatar_url} name={profile?.username} />
        <div className="title">
          <h1>Le tue camere</h1>
          <small>
            {profile?.username}
            {roomCount !== undefined && ` · ${roomCount} ${roomCount === 1 ? 'camera' : 'camere'}`}
          </small>
        </div>
        <PushBellButton
          userId={userId}
          onError={setPushError}
          onNeedsExplanation={() => setReminderKey((key) => key + 1)}
        />
      </header>

      <section className="page-body">
        <PushReminder key={reminderKey} userId={userId} />
        {pushError && <p role="alert">{pushError}</p>}

        {roomsQuery.isPending && <p className="muted">Caricamento…</p>}
        {roomsQuery.isError && <p role="alert">Errore nel caricamento delle camere.</p>}
        {roomsQuery.data && roomsQuery.data.length === 0 && (
          <p className="muted">Non fai ancora parte di nessuna camera: creane una o unisciti con un codice invito.</p>
        )}
        {roomsQuery.data && roomsQuery.data.length > 0 && (
          <ul className="room-list">
            {roomsQuery.data.map((room) => {
              const hasUnread = room.unread_count > 0
              return (
                <li key={room.id}>
                  <Link to={`/rooms/${room.id}`} className={hasUnread ? 'room-item unread' : 'room-item'}>
                    <span className="room-tile" aria-hidden="true">
                      {room.name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                    <span className="meta">
                      <b>{room.name}</b>
                      <span>{lastMessagePreview(room, userId)}</span>
                    </span>
                    <span className="room-side">
                      {room.last_message_at && (
                        <time dateTime={room.last_message_at}>{formatRoomTime(room.last_message_at)}</time>
                      )}
                      {hasUnread && (
                        <span className="unread-badge" aria-label={`${room.unread_count} non letti`}>
                          {room.unread_count > 99 ? '99+' : room.unread_count}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <span className="section-label">Aggiungi</span>

        <form onSubmit={handleCreateRoom} className="card">
          <div className="inline-form">
            <label className="field">
              Nuova camera
              <input
                type="text"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Nome della camera"
              />
            </label>
            <button type="submit" disabled={createRoom.isPending}>
              Crea camera
            </button>
          </div>
          {createRoom.isError && <p role="alert">{createRoom.error.message}</p>}
        </form>

        <form onSubmit={handleJoinRoom} className="card">
          <div className="inline-form">
            <label className="field">
              Codice invito
              <input
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Codice ricevuto da un membro"
              />
            </label>
            <button type="submit" className="btn-ghost" disabled={joinRoom.isPending}>
              Unisciti
            </button>
          </div>
          {joinRoom.isError && <p role="alert">{joinRoom.error.message}</p>}
        </form>
      </section>
    </>
  )
}
