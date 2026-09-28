import { ThemeToggle } from '../theme/ThemeToggle'
import { openSandbox } from '../sandbox/sandboxMode'
import { AccountSwitcher } from './AccountSwitcher'

export function AccountPage() {
  return (
    <>
      <header className="page-header">
        <div className="title">
          <h1>Account</h1>
        </div>
      </header>
      <section className="page-body">
        <AccountSwitcher />
        <ThemeToggle />
        {/* Il tour gira nella sandbox: non tocca i dati veri né tutorial_seen_at. */}
        <button type="button" className="btn-ghost" onClick={() => openSandbox('tour', { review: true })}>
          Rivedi la guida
        </button>
      </section>
    </>
  )
}
