import { create } from 'zustand'
import { blockSupabase } from '../../lib/supabaseClient'

// Quale sandbox è aperta: il tour guidato, la demo libera, o nessuna (app
// vera). Mentre è aperta, Root (main.tsx) smonta l'app vera: niente query,
// niente realtime, niente sessione toccata.
export type SandboxMode = 'tour' | 'demo'

interface SandboxModeState {
  mode: SandboxMode | null
  // Dove torna l'app vera alla chiusura (history.replaceState prima del
  // remount del router), e se la pagina di accesso va aperta su "Registrati".
  exitTo: string | null
  openSignup: boolean
  // Tour riaperto da Account da chi ha già un account: alla fine si torna
  // all'app invece che alla registrazione.
  review: boolean
}

export const useSandboxMode = create<SandboxModeState>(() => ({
  mode: null,
  exitTo: null,
  openSignup: false,
  review: false,
}))

export function openSandbox(mode: SandboxMode, { review = false }: { review?: boolean } = {}) {
  // Prima del cambio di stato: da qui in poi l'app vera si smonta e la
  // sandbox parte, e nessuno dei due deve più chiamare Supabase.
  blockSupabase(mode === 'tour' ? 'durante il tour' : 'durante la demo')
  useSandboxMode.setState({ mode, exitTo: window.location.pathname, openSignup: false, review })
}

export function closeSandbox({ toSignup = false }: { toSignup?: boolean } = {}) {
  const { exitTo } = useSandboxMode.getState()
  const target = toSignup ? '/login' : (exitTo ?? '/')
  if (window.location.pathname !== target) window.history.replaceState(null, '', target)
  blockSupabase(null)
  useSandboxMode.setState({ mode: null, exitTo: null, openSignup: toSignup, review: false })
}
