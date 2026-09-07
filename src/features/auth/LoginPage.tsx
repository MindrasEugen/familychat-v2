import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Mode = 'signin' | 'signup' | 'forgot-password'

export function LoginPage() {
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

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMessage(error.message)
    setLoading(false)
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const { data, error } = await supabase.auth.signUp({ email, password })
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
    }
    setLoading(false)
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

  if (mode === 'forgot-password') {
    return (
      <section>
        <h1>Password dimenticata</h1>

        <form onSubmit={handleForgotPassword}>
          <label>
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

        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setErrorMessage(null)
            setInfoMessage(null)
          }}
        >
          Torna al login
        </button>
      </section>
    )
  }

  return (
    <section>
      <h1>{mode === 'signin' ? 'Accedi' : 'Registrati'}</h1>

      <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
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

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setErrorMessage(null)
          setInfoMessage(null)
        }}
      >
        {mode === 'signin' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
      </button>

      {mode === 'signin' && (
        <button
          type="button"
          onClick={() => {
            setMode('forgot-password')
            setErrorMessage(null)
            setInfoMessage(null)
          }}
        >
          Password dimenticata?
        </button>
      )}
    </section>
  )
}
