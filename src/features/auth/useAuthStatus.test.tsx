import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './sessionStore'
import { useAuthStatus } from './useAuthStatus'

// useProfile chiama Supabase — mockato qui perché questo test copre solo la
// combinazione sessione/recovery, non il fetch del profilo.
vi.mock('./useProfile', () => ({
  useProfile: () => ({ data: { id: 'u1', username: 'Test' }, isPending: false }),
}))

const fakeSession = { user: { id: 'u1' } } as never

describe('useAuthStatus', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, initializing: false, isPasswordRecovery: false })
  })

  // Regressione da evitare: una sessione PASSWORD_RECOVERY appartiene a un
  // utente che ha già profilo (non è una nuova registrazione) — senza il
  // controllo esplicito in useAuthStatus risulterebbe "authenticated" come
  // un login normale e RequireAuth la lascerebbe entrare in app invece di
  // instradarla su /reset-password.
  it('una sessione di recovery non risulta mai "authenticated", anche con profilo già esistente', () => {
    useSessionStore.setState({ session: fakeSession, initializing: false, isPasswordRecovery: true })

    const { result } = renderHook(() => useAuthStatus())

    expect(result.current.status).toBe('password-recovery')
  })

  it('lo stesso utente risulta "authenticated" una volta azzerato isPasswordRecovery', () => {
    useSessionStore.setState({ session: fakeSession, initializing: false, isPasswordRecovery: false })

    const { result } = renderHook(() => useAuthStatus())

    expect(result.current.status).toBe('authenticated')
  })
})
