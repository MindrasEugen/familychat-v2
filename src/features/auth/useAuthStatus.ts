import { useDataApi } from '../../lib/dataApi'
import { useSessionStore } from './sessionStore'
import { useProfile } from './useProfile'

export type AuthStatus = 'loading' | 'guest' | 'needs-profile' | 'authenticated' | 'password-recovery'

// Un unico punto di verità per "dove deve stare l'utente adesso", usato sia
// dalle guardie di route (RequireAuth/GuestOnly/RequireSessionNoProfile/
// RequirePasswordRecovery) sia da chi ha bisogno di sapere chi è l'utente
// autenticato (es. la nav).
// Nel tour e nella demo l'utente è quello d'esempio della sandbox, anche se
// sul dispositivo c'è una sessione vera (ripasso da Account).
export function useAuthStatus() {
  const api = useDataApi()
  const realSession = useSessionStore((state) => state.session)
  const realInitializing = useSessionStore((state) => state.initializing)
  const realPasswordRecovery = useSessionStore((state) => state.isPasswordRecovery)
  const session = api.sandbox ? api.sandboxSession : realSession
  const initializing = api.sandbox ? false : realInitializing
  const isPasswordRecovery = api.sandbox ? false : realPasswordRecovery
  const profileQuery = useProfile(session?.user.id)

  let status: AuthStatus
  if (initializing || (session && profileQuery.isPending)) {
    status = 'loading'
  } else if (!session) {
    status = 'guest'
  } else if (isPasswordRecovery) {
    // Controllata PRIMA di "needs-profile"/"authenticated": una sessione di
    // recovery ha comunque un profilo già esistente, ma non va trattata
    // come un login normale finché la password non è stata reimpostata.
    status = 'password-recovery'
  } else if (!profileQuery.data) {
    status = 'needs-profile'
  } else {
    status = 'authenticated'
  }

  return { status, session, profile: profileQuery.data ?? null }
}
