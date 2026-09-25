import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackIcon, InfoIcon } from '../../components/icons'
import { useAuthStatus } from '../auth/useAuthStatus'
import { PushReminder } from '../notifications/PushControls'
import { useDismissRoomNotifications } from '../notifications/usePushSubscription'
import { useRoom, useRoomMembers } from '../rooms/useRoomDetail'
import { MessageComposer } from './MessageComposer'
import { MessageList, type MemberInfo } from './MessageList'
import { MESSAGES_PAGE_SIZE, useLoadOlderMessages, useMessages, useRoomMessagesRealtime } from './useMessages'

// Membri, inviti ed eliminazione/uscita sono in RoomInfoPage (pulsante ⓘ):
// qui solo i messaggi e la barra di scrittura.
export function RoomChatPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { session } = useAuthStatus()
  const userId = session?.user.id

  const roomQuery = useRoom(roomId)
  const membersQuery = useRoomMembers(roomId)
  const messagesQuery = useMessages(roomId)
  const loadOlderMessages = useLoadOlderMessages(roomId)
  const [noMoreOlderMessages, setNoMoreOlderMessages] = useState(false)
  useRoomMessagesRealtime(roomId)
  useDismissRoomNotifications(roomId)

  const membersById = useMemo(() => {
    const map = new Map<string, MemberInfo>()
    for (const member of membersQuery.data ?? []) {
      map.set(member.user_id, {
        username: member.AAA3_profiles?.username ?? null,
        avatarUrl: member.AAA3_profiles?.avatar_url ?? null,
      })
    }
    return map
  }, [membersQuery.data])

  // Scorre in fondo al primo caricamento e a ogni messaggio nuovo (cambia
  // l'ultimo id), ma non quando si caricano i precedenti (cambia solo il
  // primo): lì chi legge vuole restare dov'è.
  const scrollRef = useRef<HTMLDivElement>(null)
  // roomReady nelle dipendenze: finché la camera carica, la lista non è
  // ancora montata e il primo scroll andrebbe perso.
  const lastMessageId = messagesQuery.data?.at(-1)?.id
  const roomReady = Boolean(roomQuery.data)
  useEffect(() => {
    const scroller = scrollRef.current
    if (scroller && lastMessageId) scroller.scrollTop = scroller.scrollHeight
  }, [lastMessageId, roomReady])

  if (roomQuery.isPending) return <p className="muted page-note">Caricamento…</p>
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <p role="alert" className="page-note">
        Camera non trovata, o non ne fai parte.
      </p>
    )
  }

  const isFounder = roomQuery.data.founder_id === userId
  const memberCount = membersQuery.data?.length

  return (
    <div className="chat-page">
      <header className="page-header">
        <Link to="/rooms" className="icon-btn" aria-label="Indietro">
          <BackIcon />
        </Link>
        <div className="title">
          <h1>{roomQuery.data.name}</h1>
          {memberCount !== undefined && <small>{memberCount === 1 ? '1 membro' : `${memberCount} membri`}</small>}
        </div>
        <Link to={`/rooms/${roomId}/info`} className="icon-btn" aria-label="Info camera">
          <InfoIcon />
        </Link>
      </header>

      <div className="chat-reminder">
        <PushReminder userId={userId} />
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messagesQuery.isPending && <p className="muted center">Caricamento…</p>}
        {messagesQuery.isError && <p role="alert">Errore nel caricamento dei messaggi.</p>}
        {messagesQuery.data && messagesQuery.data.length > 0 && !noMoreOlderMessages && (
          <button
            type="button"
            className="btn-link"
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
        {noMoreOlderMessages && <p className="muted center">Inizio della cronologia.</p>}
        {messagesQuery.data && (
          <MessageList
            messages={messagesQuery.data}
            membersById={membersById}
            currentUserId={userId}
            isFounder={isFounder}
            roomId={roomId}
          />
        )}
      </div>

      <MessageComposer roomId={roomId} userId={userId} />
    </div>
  )
}
