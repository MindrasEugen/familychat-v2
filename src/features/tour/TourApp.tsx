import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { Route } from 'react-router-dom'
import type { Database } from '../../lib/database.types'
import { Brand, LoginPage } from '../auth/LoginPage'
import { CompleteProfilePage } from '../auth/CompleteProfilePage'
import { SANDBOX_USER_ID } from '../sandbox/sandboxDataApi'
import { useSandboxStoreApi } from '../sandbox/sandboxContext'
import { SandboxApp } from '../sandbox/SandboxApp'
import { GuidedTour } from './GuidedTour'

// Client finto per la registrazione del tour: stessa LoginPage del vero,
// ma nessuna chiamata all'auth. "Registrarsi" segna solo il passo come fatto.
function fakeAuthClient(onSignedUp: () => void) {
  const session = { user: { id: SANDBOX_USER_ID } } as unknown as Session
  const ok = async () => {
    onSignedUp()
    return { data: { user: session.user, session }, error: null }
  }
  return {
    auth: { signUp: ok, signInWithPassword: ok, resetPasswordForEmail: async () => ({ data: {}, error: null }) },
  } as unknown as SupabaseClient<Database>
}

function TourSignupPage() {
  const store = useSandboxStoreApi()
  return (
    <LoginPage
      client={fakeAuthClient(() => store.setState({ signedUp: true }))}
      initialMode="signup"
      initialEmail="anna@esempio.it"
      initialPassword="password-di-prova"
    />
  )
}

function TourWelcomePage() {
  return (
    <section className="auth-page">
      <Brand />
    </section>
  )
}

export function TourApp() {
  return (
    <SandboxApp
      withProfile={false}
      initialPath="/tour"
      extraRoutes={
        <>
          <Route path="/tour" element={<TourWelcomePage />} />
          <Route path="/signup" element={<TourSignupPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage initialUsername="Anna" />} />
        </>
      }
    >
      {(sandbox) => <GuidedTour sandbox={sandbox} />}
    </SandboxApp>
  )
}
