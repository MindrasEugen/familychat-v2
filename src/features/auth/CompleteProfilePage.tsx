import type { PostgrestError } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { describeProfileInsertError } from './errors'
import { useAuthStatus } from './useAuthStatus'
import { useCompleteProfile } from './useProfile'

function isPostgrestError(error: PostgrestError | Error): error is PostgrestError {
  return 'code' in error
}

export function CompleteProfilePage() {
  const { session } = useAuthStatus()
  const completeProfile = useCompleteProfile(session?.user.id)
  const [username, setUsername] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)

    const trimmed = username.trim()
    if (!trimmed) {
      setValidationError('Scegli uno username.')
      return
    }

    completeProfile.mutate(trimmed)
  }

  const errorMessage =
    validationError ??
    (completeProfile.error
      ? isPostgrestError(completeProfile.error)
        ? describeProfileInsertError(completeProfile.error)
        : completeProfile.error.message
      : null)

  return (
    <section>
      <h1>Completa il profilo</h1>
      <p>Scegli lo username con cui la famiglia ti vedrà nelle camere.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <button type="submit" disabled={completeProfile.isPending}>
          Continua
        </button>
      </form>
    </section>
  )
}
