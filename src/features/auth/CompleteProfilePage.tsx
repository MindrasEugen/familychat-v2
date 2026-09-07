import type { PostgrestError } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const previewUrl = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : null), [avatarFile])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    setAvatarFile(event.target.files?.[0] ?? null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)

    const trimmed = username.trim()
    if (!trimmed) {
      setValidationError('Scegli uno username.')
      return
    }

    completeProfile.mutate({ username: trimmed, avatarFile })
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
        <label>
          Foto profilo (opzionale)
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
        {previewUrl && <img src={previewUrl} alt="Anteprima foto profilo" style={{ maxWidth: 100 }} />}
        {errorMessage && <p role="alert">{errorMessage}</p>}
        <button type="submit" disabled={completeProfile.isPending}>
          Continua
        </button>
      </form>
    </section>
  )
}
