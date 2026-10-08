import { useEffect, useState, type FormEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { useAuthStatus } from '../auth/useAuthStatus'
import {
  formatFriendCode,
  useAcceptFriendRequest,
  useDeleteFriendRequest,
  useFriendRequests,
  useFriends,
  useMyFriendCode,
  useOpenDirectChat,
  useRegenerateFriendCode,
  useRemoveFriend,
  useSendFriendRequest,
} from './useFriends'

// Gestisce codice amico, richieste ricevute/inviate e conversazioni con gli amici.
export function FriendsPage() {
  const { session } = useAuthStatus()
  const userId = session?.user.id
  const friendCodeQuery = useMyFriendCode(userId)
  const regenerateCode = useRegenerateFriendCode(userId)
  const sendRequest = useSendFriendRequest(userId)
  const requestsQuery = useFriendRequests(userId)
  const acceptRequest = useAcceptFriendRequest(userId)
  const rejectRequest = useDeleteFriendRequest(userId)
  const cancelRequest = useDeleteFriendRequest(userId)
  const friendsQuery = useFriends(userId)
  const removeFriend = useRemoveFriend(userId)
  const openDirectChat = useOpenDirectChat()

  const [friendCode, setFriendCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmNewCode, setConfirmNewCode] = useState(false)
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null)

  const formattedCode = friendCodeQuery.data ? formatFriendCode(friendCodeQuery.data) : ''
  const friendCount = friendsQuery.data?.length

  useEffect(() => {
    if (!copied) return

    const timeoutId = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  async function copyFriendCode() {
    if (!formattedCode || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(formattedCode)
      setCopied(true)
    } catch {
      // La copia può essere bloccata dal browser: la pagina resta utilizzabile.
    }
  }

  function shareFriendCode() {
    if (!formattedCode || typeof navigator.share !== 'function') return

    void navigator.share({ text: `Il mio codice amico su Chat Famiglia: ${formattedCode}` }).catch(() => {})
  }

  function handleSendRequest(event: FormEvent) {
    event.preventDefault()
    const code = friendCode.trim()
    if (!code) return

    sendRequest.mutate(code, {
      onSuccess: (result) => {
        if (result === 'sent' || result === 'accepted') setFriendCode('')
      },
    })
  }

  return (
    <>
      <header className="page-header">
        <div className="title">
          <h1>Amici</h1>
          {friendCount !== undefined && <small>{friendCount === 1 ? '1 amico' : `${friendCount} amici`}</small>}
        </div>
      </header>

      <section className="page-body">
        <div className="card">
          <span className="section-label">Il tuo codice amico</span>
          {friendCodeQuery.isPending ? (
            <p className="muted">Caricamento…</p>
          ) : (
            <code>{formattedCode}</code>
          )}
          <p className="muted small">Mandalo a chi vuoi aggiungere: ti arriverà una richiesta da accettare.</p>
          <div className="row">
            <button type="button" onClick={copyFriendCode} disabled={!formattedCode}>
              {copied ? 'Copiato' : 'Copia'}
            </button>
            {typeof navigator.share === 'function' && (
              <button type="button" className="btn-ghost" onClick={shareFriendCode} disabled={!formattedCode}>
                Condividi
              </button>
            )}
          </div>
          {confirmNewCode ? (
            <>
              <p className="muted small">Il codice attuale smetterà di funzionare. Gli amici che hai già restano.</p>
              <div className="row">
                <button
                  type="button"
                  onClick={() => regenerateCode.mutate(undefined, { onSuccess: () => setConfirmNewCode(false) })}
                  disabled={regenerateCode.isPending}
                >
                  Conferma
                </button>
                <button type="button" className="btn-link" onClick={() => setConfirmNewCode(false)} disabled={regenerateCode.isPending}>
                  Annulla
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn-link" onClick={() => setConfirmNewCode(true)} disabled={regenerateCode.isPending}>
              Genera un nuovo codice
            </button>
          )}
          {friendCodeQuery.isError && <p role="alert">Errore nel caricamento del codice amico.</p>}
          {regenerateCode.isError && <p role="alert">{regenerateCode.error.message}</p>}
        </div>

        <div className="card">
          <span className="section-label">Aggiungi un amico</span>
          <form className="inline-form" onSubmit={handleSendRequest}>
            <label className="field">
              Codice amico
              <input
                type="text"
                value={friendCode}
                onChange={(event) => setFriendCode(event.target.value)}
                placeholder="ABCD-EFGH"
                autoCapitalize="characters"
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={sendRequest.isPending || !friendCode.trim()}>
              Invia richiesta
            </button>
          </form>
          {sendRequest.data === 'sent' && <p role="status">Richiesta inviata: ora deve accettarla.</p>}
          {sendRequest.data === 'accepted' && <p role="status">Vi siete cercati a vicenda: ora siete amici!</p>}
          {sendRequest.data === 'already_friends' && <p role="status">Siete già amici.</p>}
          {sendRequest.data === 'already_sent' && <p role="status">Avevi già mandato una richiesta: è ancora in attesa.</p>}
          {sendRequest.isError && <p role="alert">{sendRequest.error.message}</p>}
        </div>

        {requestsQuery.data && requestsQuery.data.incoming.length > 0 && (
          <div className="card">
            <span className="section-label">Richieste ricevute</span>
            {requestsQuery.data.incoming.map((request) => (
              <div key={request.id} className="member">
                <Avatar url={request.person.avatarUrl} name={request.person.username} size="sm" />
                <b>{request.person.username}</b>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => acceptRequest.mutate(request.id)}
                  disabled={acceptRequest.isPending}
                >
                  Accetta
                </button>
                <button
                  type="button"
                  className="btn-link danger"
                  onClick={() => rejectRequest.mutate(request.id)}
                  disabled={rejectRequest.isPending}
                >
                  Rifiuta
                </button>
              </div>
            ))}
            {acceptRequest.isError && <p role="alert">{acceptRequest.error.message}</p>}
            {rejectRequest.isError && <p role="alert">{rejectRequest.error.message}</p>}
          </div>
        )}

        <div className="card">
          <span className="section-label">Amici</span>
          {friendsQuery.isPending && <p className="muted">Caricamento…</p>}
          {friendsQuery.isError && <p role="alert">Errore nel caricamento degli amici.</p>}
          {friendsQuery.data?.length === 0 && <p className="muted">Non hai ancora amici: scambiatevi il codice amico qui sopra.</p>}
          {friendsQuery.data?.map((friend) => (
            <div key={friend.userId} className="member">
              <Avatar url={friend.avatarUrl} name={friend.username} size="sm" />
              <b>{friend.username}</b>
              {removingFriendId === friend.userId ? (
                <>
                  <span className="muted small">Togliere {friend.username} dagli amici? La chat privata resterà da rileggere.</span>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removeFriend.mutate(friend.userId, { onSuccess: () => setRemovingFriendId(null) })}
                    disabled={removeFriend.isPending}
                  >
                    Togli
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setRemovingFriendId(null)}
                    disabled={removeFriend.isPending}
                  >
                    Annulla
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => openDirectChat.mutate(friend.userId)}
                    disabled={openDirectChat.isPending}
                  >
                    Scrivi
                  </button>
                  <button type="button" className="btn-link danger" onClick={() => setRemovingFriendId(friend.userId)}>
                    Togli
                  </button>
                </>
              )}
            </div>
          ))}
          {removeFriend.isError && <p role="alert">{removeFriend.error.message}</p>}
          {openDirectChat.isError && <p role="alert">{openDirectChat.error.message}</p>}
        </div>

        {requestsQuery.data && requestsQuery.data.outgoing.length > 0 && (
          <div className="card">
            <span className="section-label">Richieste inviate</span>
            {requestsQuery.data.outgoing.map((request) => (
              <div key={request.id} className="member">
                <Avatar url={request.person.avatarUrl} name={request.person.username} size="sm" />
                <b>{request.person.username}</b>
                <span className="chip">In attesa</span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => cancelRequest.mutate(request.id)}
                  disabled={cancelRequest.isPending}
                >
                  Annulla
                </button>
              </div>
            ))}
            {cancelRequest.isError && <p role="alert">{cancelRequest.error.message}</p>}
          </div>
        )}
        {requestsQuery.isError && <p role="alert">Errore nel caricamento delle richieste.</p>}
      </section>
    </>
  )
}
