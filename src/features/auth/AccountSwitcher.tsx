import { Link } from 'react-router-dom'
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
    <span>
      {profile?.avatar_url && (
        <img src={profile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
      )}{' '}
      {profile?.username}{' '}
      {others.map((account) => (
        <button key={account.slot} type="button" onClick={() => switchActiveAccount(account.slot)}>
          Passa a {account.username ?? 'altro account'}
        </button>
      ))}{' '}
      {accounts.length < MAX_ACCOUNTS && <Link to="/add-account">Aggiungi account</Link>}{' '}
      <button type="button" onClick={() => removeAccount(activeSlot)}>
        Esci
      </button>
    </span>
  )
}
