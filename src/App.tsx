import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { CompleteProfilePage } from './features/auth/CompleteProfilePage'
import { LoginPage } from './features/auth/LoginPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { GuestOnly, RequireAuth, RequirePasswordRecovery, RequireSessionNoProfile } from './features/auth/routeGuards'
import { initSessionListener } from './features/auth/sessionStore'
import { registerServiceWorker } from './lib/registerServiceWorker'
import { useAuthStatus } from './features/auth/useAuthStatus'
import { RoomChatPage } from './features/chat/RoomChatPage'
import { RoomsListPage } from './features/rooms/RoomsListPage'
import { TranslatorPage } from './features/translator/TranslatorPage'
import { queryClient } from './lib/queryClient'
import { supabase } from './lib/supabaseClient'

function NavAuthStatus() {
  const { status, profile } = useAuthStatus()

  if (status !== 'authenticated') return null

  return (
    <span>
      {profile?.avatar_url && (
        <img src={profile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
      )}{' '}
      {profile?.username}{' '}
      <button type="button" onClick={() => supabase.auth.signOut()}>
        Esci
      </button>
    </span>
  )
}

function AppLayout() {
  return (
    <>
      <nav>
        <Link to="/rooms">Camere</Link>
        <Link to="/translator">Traduttore</Link>
        <NavAuthStatus />
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/rooms" replace />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
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
          path="/translator"
          element={
            <RequireAuth>
              <TranslatorPage />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  )
}

function App() {
  useEffect(() => initSessionListener(), [])
  useEffect(() => registerServiceWorker(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  )
}

export default App
