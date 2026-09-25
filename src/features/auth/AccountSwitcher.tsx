import { Link } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { MAX_ACCOUNTS } from '../../lib/supabaseClient'
import { removeAccount, switchActiveAccount, useAccountsStore } from './accountsStore'
import { useAuthStatus } from './useAuthStatus'

// Un account alla volta è "attivo" (vedi NOTE.md, 2026-09-08): cambiare
// account qui rimonta l'intero albero autenticato (key={activeSlot} in
// App.tsx), niente sottoscrizioni realtime a cavallo tra due account.
export function AccountSwitcher() {
  const { status, profile } = useAuthStatus()
  const accounts = useAccountsStore((state) => state.accounts)
  const activeSlot = useAccountsStore((state) => state.activeSlot)

  if (status !== 'authenticated') return null

  const others = accounts.filter((account) => account.slot !== activeSlot)

  return (
    <div className="card">
      <div className="row">
        <Avatar url={profile?.avatar_url} name={profile?.username} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{profile?.username}</h2>
          <small className="muted">Account attivo</small>
        </div>
      </div>
      {others.map((account) => (
        <button
          key={account.slot}
          type="button"
          className="btn-ghost"
          onClick={() => switchActiveAccount(account.slot)}
        >
          Passa a {account.username ?? 'altro account'}
        </button>
      ))}
      {accounts.length < MAX_ACCOUNTS && (
        <Link to="/add-account" className="btn-link">
          Aggiungi un secondo account
        </Link>
      )}
      <button type="button" className="btn-danger" onClick={() => removeAccount(activeSlot)}>
        Esci
      </button>
    </div>
  )
}
