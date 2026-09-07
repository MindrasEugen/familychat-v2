import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStatus } from './useAuthStatus'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  if (status === 'password-recovery') return <Navigate to="/reset-password" replace />
  return children
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'authenticated') return <Navigate to="/rooms" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  if (status === 'password-recovery') return <Navigate to="/reset-password" replace />
  return children
}

export function RequireSessionNoProfile({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'authenticated') return <Navigate to="/rooms" replace />
  if (status === 'password-recovery') return <Navigate to="/reset-password" replace />
  return children
}

// La pagina "imposta nuova password" è raggiungibile solo durante una vera
// sessione di recovery — mai come login normale (anche se autenticato) né
// da ospite, per non esporre un modo per cambiare la password di qualcun
// altro semplicemente visitando l'URL.
export function RequirePasswordRecovery({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  if (status === 'authenticated') return <Navigate to="/rooms" replace />
  return children
}
