import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Brand } from './LoginPage'
import { useSessionStore } from './sessionStore'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Le due password non coincidono.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    // La sessione di recovery è ora una sessione normale a tutti gli
    // effetti (password aggiornata) — RequireAuth/GuestOnly la instraderanno
    // su /rooms non appena questo flag torna false.
    useSessionStore.setState({ isPasswordRecovery: false })
  }

  return (
    <section className="auth-page">
      <Brand />
      <div className="intro">
        <h1>Imposta nuova password</h1>
        <p className="muted">Scegline una di almeno 6 caratteri.</p>
      </div>

      <form onSubmit={handleSubmit} className="stack">
        <label className="field">
          Nuova password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          Conferma password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>

        {errorMessage && <p role="alert">{errorMessage}</p>}

        <button type="submit" disabled={loading}>
          Salva nuova password
        </button>
      </form>
    </section>
  )
}
