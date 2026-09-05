import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStatus } from './useAuthStatus'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'authenticated') return <Navigate to="/rooms" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  return children
}

export function RequireSessionNoProfile({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'authenticated') return <Navigate to="/rooms" replace />
  return children
}
