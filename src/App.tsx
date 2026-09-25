import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, NavLink, Route, Routes, useMatch } from 'react-router-dom'
import { ChatIcon, TranslateIcon, UserIcon } from './components/icons'
import { AccountPage } from './features/auth/AccountPage'
import { AddAccountPage } from './features/auth/AddAccountPage'
import { CompleteProfilePage } from './features/auth/CompleteProfilePage'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import {
  GuestOnly,
  RequireAuth,
  RequireCanAddAccount,
  RequirePasswordRecovery,
  RequireSessionNoProfile,
} from './features/auth/routeGuards'
import { initAccounts, registerAccount, updateActiveAccountProfile, useAccountsStore } from './features/auth/accountsStore'
import { registerServiceWorker } from './lib/registerServiceWorker'
import { useAuthStatus } from './features/auth/useAuthStatus'
import { RoomChatPage } from './features/chat/RoomChatPage'
import { RoomInfoPage } from './features/rooms/RoomInfoPage'
import { RoomsListPage } from './features/rooms/RoomsListPage'
import { TranslatorPage } from './features/translator/TranslatorPage'
import { queryClient } from './lib/queryClient'

// Tiene le etichette dello switcher (username/avatar) allineate al profilo
// dell'account attivo, senza query aggiuntive: si aggancia agli stessi dati
// che il resto dell'app carica comunque per sé (vedi accountsStore.ts).
function useSyncActiveAccountProfile() {
  const { profile } = useAuthStatus()

  useEffect(() => {
    if (profile) updateActiveAccountProfile(profile.username, profile.avatar_url)
  }, [profile])
}

// Barra in basso, solo per chi ha fatto l'accesso. Nascosta dentro una
// chat: lì il fondo dello schermo è della barra di scrittura.
function TabBar() {
  const { status } = useAuthStatus()
  const inChat = useMatch('/rooms/:roomId/*')

  if (status !== 'authenticated' || inChat) return null

  return (
    <nav className="tabbar" aria-label="Navigazione principale">
      <div className="tabbar-inner">
        <NavLink to="/rooms">
          <ChatIcon />
          Camere
        </NavLink>
        <NavLink to="/translator">
          <TranslateIcon />
          Traduttore
        </NavLink>
        <NavLink to="/account">
          <UserIcon />
          Account
        </NavLink>
      </div>
    </nav>
  )
}

function AppLayout() {
  useSyncActiveAccountProfile()

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/rooms" replace />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage
                onSignedIn={(session) =>
                  registerAccount(useAccountsStore.getState().activeSlot, session.user.id)
                }
              />
            </GuestOnly>
          }
        />
        <Route
          path="/add-account"
          element={
            <RequireCanAddAccount>
              <AddAccountPage />
            </RequireCanAddAccount>
          }
        />
        <Route
          path="/reset-password"
          element={
            <RequirePasswordRecovery>
              <ResetPasswordPage />
            </RequirePasswordRecovery>
          }
        />
        <Route
          path="/complete-profile"
          element={
            <RequireSessionNoProfile>
              <CompleteProfilePage />
            </RequireSessionNoProfile>
          }
        />
        <Route
          path="/rooms"
          element={
            <RequireAuth>
              <RoomsListPage />
            </RequireAuth>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <RequireAuth>
              <RoomChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/rooms/:roomId/info"
          element={
            <RequireAuth>
              <RoomInfoPage />
            </RequireAuth>
          }
        />
        <Route
          path="/translator"
          element={
            <RequireAuth>
              <TranslatorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
      </Routes>
      <TabBar />
    </>
  )
}

function App() {
  // key={activeSlot}: forza un remount completo dell'albero quando cambia
  // l'account attivo (vedi AccountSwitcher). Necessario perché componenti
  // come RoomChatPage aprono un canale realtime legato al client attivo AL
  // MOMENTO del mount (roomId nell'URL non cambia da solo cambiando
  // account) — senza un remount resterebbero agganciati al client
  // dell'account precedente. Le query React Query restano invece in cache
  // per userId/roomId (non svuotate qui): tornare su un account già visto
  // in questa sessione è quindi istantaneo, non un nuovo fetch a vuoto.
  const activeSlot = useAccountsStore((state) => state.activeSlot)

  useEffect(() => initAccounts(), [])
  useEffect(() => registerServiceWorker(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout key={activeSlot} />
    </QueryClientProvider>
  )
}

export default App
