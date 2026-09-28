import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from '../../components/TabBar'
import { DataApiContext } from '../../lib/dataApi'
import { RoomChatPage } from '../chat/RoomChatPage'
import { RoomInfoPage } from '../rooms/RoomInfoPage'
import { RoomsListPage } from '../rooms/RoomsListPage'
import { TranslatorPage } from '../translator/TranslatorPage'
import { createSandboxDataApi, createSandboxStore, type SandboxStore } from './sandboxDataApi'

export interface Sandbox {
  store: SandboxStore
}

// Le stesse pagine dell'app vera, con i dati d'esempio in memoria: router
// in memoria (l'URL del browser non cambia), React Query e sorgente dati
// propri. Tutto sparisce allo smontaggio.
export function SandboxApp({
  withProfile,
  initialPath,
  extraRoutes,
  children,
}: {
  withProfile: boolean
  initialPath: string
  extraRoutes?: ReactNode
  children?: (sandbox: Sandbox) => ReactNode
}) {
  const [sandbox] = useState(() => {
    const store = createSandboxStore({ withProfile })
    return {
      store,
      api: createSandboxDataApi(store),
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    }
  })

  return (
    <DataApiContext.Provider value={sandbox.api}>
      <QueryClientProvider client={sandbox.queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/rooms" element={<RoomsListPage />} />
            <Route path="/rooms/:roomId" element={<RoomChatPage />} />
            <Route path="/rooms/:roomId/info" element={<RoomInfoPage />} />
            <Route path="/translator" element={<TranslatorPage />} />
            {extraRoutes}
            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
          <TabBar />
          {children?.(sandbox)}
        </MemoryRouter>
      </QueryClientProvider>
    </DataApiContext.Provider>
  )
}
