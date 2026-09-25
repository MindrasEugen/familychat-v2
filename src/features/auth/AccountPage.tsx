import { useState } from 'react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { TutorialDialog } from '../tutorial/WelcomeTutorial'
import { AccountSwitcher } from './AccountSwitcher'

export function AccountPage() {
  // Rivedere la guida non tocca tutorial_seen_at: è solo una riapertura.
  const [showTutorial, setShowTutorial] = useState(false)

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
        <button type="button" className="btn-ghost" onClick={() => setShowTutorial(true)}>
          Rivedi la guida
        </button>
      </section>
      {showTutorial && <TutorialDialog onDone={() => setShowTutorial(false)} />}
    </>
  )
}
