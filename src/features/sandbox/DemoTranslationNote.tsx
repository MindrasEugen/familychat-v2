import { useContext } from 'react'
import { useStore } from 'zustand'
import { CloseIcon } from '../../components/icons'
import { getTourTexts } from '../tutorial/tutorialTexts'
import { SandboxStoreContext } from './sandboxContext'
import type { SandboxStore } from './sandboxDataApi'
import { useSandboxMode } from './sandboxMode'

// Avviso discreto sopra la barra di scrittura, solo nella demo libera: lì le
// traduzioni sono risposte fisse d'esempio e i messaggi scritti non vengono
// tradotti. Nel tour e nell'app vera non compare.
export function DemoTranslationNote() {
  const inDemo = useSandboxMode((state) => state.mode === 'demo')
  const store = useContext(SandboxStoreContext)
  if (!inDemo || !store) return null
  return <Note store={store} />
}

function Note({ store }: { store: SandboxStore }) {
  const dismissed = useStore(store, (state) => state.demoNoteDismissed)
  if (dismissed) return null

  return (
    <div className="demo-note" role="note">
      <p>{getTourTexts().demo.translationNote}</p>
      <button
        type="button"
        className="btn-link"
        aria-label="Chiudi avviso"
        onClick={() => store.setState({ demoNoteDismissed: true })}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
