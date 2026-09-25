import { useState, type FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'
import { ChatIcon } from '../../components/icons'

type Mode = 'signin' | 'signup' | 'forgot-password'

interface LoginPageProps {
  // Di default il client "attivo" condiviso (login/registrazione normali).
  // AddAccountPage passa esplicitamente il client di uno slot libero, così
  // il login di un secondo account non tocca la sessione già attiva
  // dell'account corrente finché non ha successo (vedi AddAccountPage.tsx).
  client?: SupabaseClient<Database>
  // Chiamato solo dopo un vero login/registrazione con sessione immediata
  // (mai dopo un signUp che richiede conferma email, lì non esiste ancora
  // nessuna sessione da registrare). Il chiamante decide cosa "registrare"
  // questo login come (slot attivo per /login, un nuovo slot per
  // /add-account) — LoginPage non ha e non deve avere quel contesto.
  onSignedIn?: (session: Session) => void
  // Falso quando la pagina è dentro AddAccountPage, che ha già il suo
  // header: niente logo ripetuto.
  showBrand?: boolean
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <ChatIcon />
      </span>
      Chat Famiglia
    </div>
  )
}

export function LoginPage({ client = supabase, onSignedIn, showBrand = true }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  async function handleSignIn(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    if (data.session) onSignedIn?.(data.session)
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const { data, error } = await client.auth.signUp({ email, password })
    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    // Lo username viene chiesto subito dopo, nella schermata "completa il
    // profilo" (RequireSessionNoProfile in App.tsx si occupa di instradarci
    // lì non appena la sessione è attiva) — non qui: un insert tentato in
    // questo stesso gestore perderebbe la corsa con il redirect automatico
    // che scatta appena l'evento di login arriva al resto dell'app.
    if (!data.session) {
      setInfoMessage(
        'Registrazione avviata: controlla la tua email per confermare l\'account, poi accedi.',
      )
      setMode('signin')
    } else {
      // Progetto con autoconferma email attiva: sessione già disponibile
      // subito, nessun secondo passaggio di login necessario.
      onSignedIn?.(data.session)
    }
    setLoading(false)
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    // Messaggio generico a prescindere dal fatto che l'email esista o meno
    // (non far capire dall'esterno quali indirizzi sono registrati).
    setInfoMessage("Se l'indirizzo esiste, riceverai un'email con le istruzioni per reimpostare la password.")
  }

  function switchMode(next: Mode) {
    setMode(next)
    setErrorMessage(null)
    setInfoMessage(null)
  }

  if (mode === 'forgot-password') {
    return (
      <section className="auth-page">
        {showBrand && <Brand />}
        <div className="intro">
          <h1>Password dimenticata</h1>
          <p className="muted">Ti mandiamo un link per sceglierne una nuova.</p>
        </div>

        <form onSubmit={handleForgotPassword} className="stack">
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          {errorMessage && <p role="alert">{errorMessage}</p>}
          {infoMessage && <p role="status">{infoMessage}</p>}

          <button type="submit" disabled={loading}>
            Invia link di reset
          </button>
        </form>

        <div className="row spread">
          <button type="button" className="btn-link" onClick={() => switchMode('signin')}>
            Torna al login
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-page">
      {showBrand && <Brand />}
      <div className="intro">
        <h1>{mode === 'signin' ? 'Accedi' : 'Registrati'}</h1>
        <p className="muted">
          {mode === 'signin'
            ? 'Accedi per ritrovare le tue camere di famiglia.'
            : 'Crea il tuo account per entrare nelle camere di famiglia.'}
        </p>
      </div>

      <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="stack">
        <label className="field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>

        {errorMessage && <p role="alert">{errorMessage}</p>}
        {infoMessage && <p role="status">{infoMessage}</p>}

        <button type="submit" disabled={loading}>
          {mode === 'signin' ? 'Accedi' : 'Crea account'}
        </button>
      </form>

      <div className="row spread">
        {mode === 'signin' && (
          <button type="button" className="btn-link" onClick={() => switchMode('forgot-password')}>
            Password dimenticata?
          </button>
        )}
        <button
          type="button"
          className="btn-link"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </section>
  )
}
