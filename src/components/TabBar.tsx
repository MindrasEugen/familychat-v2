import { NavLink, useMatch } from 'react-router-dom'
import { useAuthStatus } from '../features/auth/useAuthStatus'
import { useRooms, useRoomsRealtime } from '../features/rooms/useRooms'
import { useDataApi } from '../lib/dataApi'
import { ChatIcon, TranslateIcon, UserIcon } from './icons'

// Barra in basso, solo per chi ha fatto l'accesso. Nascosta dentro una
// chat: lì il fondo dello schermo è della barra di scrittura.
export function TabBar() {
  const { status, session } = useAuthStatus()
  const { sandbox } = useDataApi()
  const inChat = useMatch('/rooms/:roomId/*')
  // Qui e non nella lista camere: la barra è montata su tutte le pagine
  // dopo l'accesso, così il pallino dei non letti su "Camere" resta
  // aggiornato anche dal traduttore o dall'account.
  const userId = session?.user.id
  const roomsQuery = useRooms(userId)
  useRoomsRealtime(userId)
  const totalUnread = roomsQuery.data?.reduce((sum, room) => sum + room.unread_count, 0) ?? 0

  if (status !== 'authenticated' || inChat) return null

  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      <div className="tabbar-inner">
        <NavLink to="/rooms">
          <span className="tab-icon">
            <ChatIcon />
            {totalUnread > 0 && (
              <span className="tab-badge" aria-label={`${totalUnread} messaggi non letti`}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </span>
          Camere
        </NavLink>
        <NavLink to="/translator">
          <TranslateIcon />
          Traduttore
        </NavLink>
        {/* Nel tour e nella demo niente Account: lì ci sono gli account veri. */}
        {!sandbox && (
          <NavLink to="/account">
            <UserIcon />
            Account
          </NavLink>
        )}
      </div>
    </nav>
  )
}
