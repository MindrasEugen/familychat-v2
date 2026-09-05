import { QueryClientProvider } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { RoomChatPage } from './features/chat/RoomChatPage'
import { RoomsListPage } from './features/rooms/RoomsListPage'
import { TranslatorPage } from './features/translator/TranslatorPage'
import { queryClient } from './lib/queryClient'

function AppLayout() {
  return (
    <>
      <nav>
        <Link to="/rooms">Camere</Link>
        <Link to="/translator">Traduttore</Link>
        <Link to="/login">Accedi</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/rooms" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/rooms" element={<RoomsListPage />} />
        <Route path="/rooms/:roomId" element={<RoomChatPage />} />
        <Route path="/translator" element={<TranslatorPage />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  )
}

export default App
