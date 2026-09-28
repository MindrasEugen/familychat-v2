import { useEffect } from 'react'
import { useMatch } from 'react-router-dom'
import { useAccountsStore } from '../auth/accountsStore'
import { useAuthStatus } from '../auth/useAuthStatus'
import { openSandbox } from '../sandbox/sandboxMode'
import { isTourSeen } from './tourSeen'

// Primo accesso su questo dispositivo: ospite sulla pagina di accesso,
// nessun account già usato qui e tour mai visto (né saltato).
export function useAutoStartTour() {
  const { status } = useAuthStatus()
  const onLogin = useMatch('/login')
  const hasAccounts = useAccountsStore((state) => state.accounts.length > 0)

  useEffect(() => {
    if (status === 'guest' && onLogin && !hasAccounts && !isTourSeen()) openSandbox('tour')
  }, [status, onLogin, hasAccounts])
}
