import { ThemeToggle } from '../theme/ThemeToggle'
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
      </section>
    </>
  )
}
