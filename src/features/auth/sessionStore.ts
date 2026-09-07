import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../../lib/supabaseClient'

interface SessionState {
  session: Session | null
  initializing: boolean
  // true quando la sessione attiva viene dal link "password dimenticata"
  // (evento PASSWORD_RECOVERY), non da un login normale — usato per
  // instradare l'utente su "imposta nuova password" invece che in app
  // (vedi useAuthStatus/routeGuards). Va azzerato esplicitamente dopo che
  // la password è stata aggiornata con successo.
  isPasswordRecovery: boolean
}

export const useSessionStore = create<SessionState>(() => ({
  session: null,
  initializing: true,
  isPasswordRecovery: false,
}))

// Chiamata una sola volta all'avvio dell'app (vedi App.tsx). Tiene la
// sessione sincronizzata con gli eventi di Supabase Auth (login, logout,
// refresh token) invece di leggerla una volta sola all'avvio.
export function initSessionListener() {
  supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({ session: data.session, initializing: false })
  })

  const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
    // Non tocca isPasswordRecovery per eventi diversi da questi due: un
    // TOKEN_REFRESHED durante una sessione di recovery non deve farla
    // sembrare tornata "normale".
    const patch: Partial<SessionState> = { session, initializing: false }
    if (event === 'PASSWORD_RECOVERY') patch.isPasswordRecovery = true
    if (event === 'SIGNED_OUT') patch.isPasswordRecovery = false
    useSessionStore.setState(patch)
  })

  return () => subscription.subscription.unsubscribe()
}
