import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccountsStore } from './accountsStore'
import { useAuthStatus } from './useAuthStatus'
import { MAX_ACCOUNTS } from '../../lib/supabaseClient'

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

// "Aggiungi account" richiede un account già completo (non ha senso
// aggiungerne un secondo se il primo non è nemmeno loggato) e uno slot
// libero — il limite di 2 è una scelta esplicita dell'utente, non tecnica
// (vedi ACCOUNT_SLOTS in lib/supabaseClient.ts).
export function RequireCanAddAccount({ children }: { children: ReactNode }) {
  const { status } = useAuthStatus()
  const accountsCount = useAccountsStore((state) => state.accounts.length)

  if (status === 'loading') return <p>Caricamento…</p>
  if (status === 'guest') return <Navigate to="/login" replace />
  if (status === 'needs-profile') return <Navigate to="/complete-profile" replace />
  if (status === 'password-recovery') return <Navigate to="/reset-password" replace />
  if (accountsCount >= MAX_ACCOUNTS) return <Navigate to="/rooms" replace />
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
