import { useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { getClientForSlot } from '../../lib/supabaseClient'
import { nextFreeSlot, registerAccount, switchActiveAccount } from './accountsStore'
import { LoginPage } from './LoginPage'

// Login/registrazione per un SECONDO account su questo dispositivo. A
// differenza di /login, opera esplicitamente sul client di uno slot libero
// (mai su quello attivo): l'account già loggato resta autenticato e visibile
// finché questo login non va a buon fine — solo allora si passa attivamente
// al nuovo slot (vedi onSignedIn sotto). Se l'utente abbandona questa pagina
// a metà, lo slot resta semplicemente senza sessione, senza inquinare la
// lista degli account noti (che si aggiorna solo su un login riuscito).
export function AddAccountPage() {
  const navigate = useNavigate()
  // Letto una sola volta al mount: RequireCanAddAccount ha già verificato
  // che ci sia uno slot libero prima di montare questa pagina.
  const slot = useMemo(() => nextFreeSlot(), [])
  const client = useMemo(() => (slot ? getClientForSlot(slot) : null), [slot])

  if (!slot || !client) {
    // Difesa in profondità: non dovrebbe accadere, RequireCanAddAccount
    // reindirizza già altrove se il limite è raggiunto.
    return <p role="alert">Hai già raggiunto il limite di 2 account su questo dispositivo.</p>
  }

  function handleSignedIn(session: Session) {
    registerAccount(slot as NonNullable<typeof slot>, session.user.id)
    switchActiveAccount(slot as NonNullable<typeof slot>)
    navigate('/rooms', { replace: true })
  }

  return (
    <section>
      <h1>Aggiungi un secondo account</h1>
      <p>
        L'account già connesso su questo dispositivo resta attivo: accedi qui con le credenziali del
        secondo account che vuoi aggiungere.
      </p>
      <LoginPage client={client} onSignedIn={handleSignedIn} />
    </section>
  )
}
