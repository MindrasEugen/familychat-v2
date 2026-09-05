import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../../lib/supabaseClient'

interface SessionState {
  session: Session | null
  initializing: boolean
}

export const useSessionStore = create<SessionState>(() => ({
  session: null,
  initializing: true,
}))

// Chiamata una sola volta all'avvio dell'app (vedi App.tsx). Tiene la
// sessione sincronizzata con gli eventi di Supabase Auth (login, logout,
// refresh token) invece di leggerla una volta sola all'avvio.
export function initSessionListener() {
  supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({ session: data.session, initializing: false })
  })

  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({ session, initializing: false })
  })

  return () => subscription.subscription.unsubscribe()
}
