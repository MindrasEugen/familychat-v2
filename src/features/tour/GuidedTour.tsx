import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from 'zustand'
import type { Sandbox } from '../sandbox/sandboxContext'
import { closeSandbox, useSandboxMode } from '../sandbox/sandboxMode'
import { markTourSeen } from './tourSeen'
import { isLastStep, isStepDone, TOUR_STEPS } from './tourSteps'
import { TourOverlay } from './TourOverlay'

// Motore del tour: porta la sandbox sulla schermata del passo, evidenzia
// l'elemento e, sui passi con un'azione richiesta, va avanti da solo quando
// l'azione risulta fatta. "Salta" e la fine segnano il tour come visto.
export function GuidedTour({ sandbox }: { sandbox: Sandbox }) {
  const [index, setIndex] = useState(0)
  const review = useSandboxMode((mode) => mode.review)
  const navigate = useNavigate()
  const state = useStore(sandbox.store)
  const step = TOUR_STEPS[index]
  const done = isStepDone(step, state)

  // Azione già fatta quando si entra nel passo (tornando indietro): niente
  // avanzamento automatico, compare "Avanti" come nei passi senza azione.
  const [entry, setEntry] = useState({ index, done })
  if (entry.index !== index) setEntry({ index, done })
  const waitsForAction = Boolean(step.doneWhen) && !entry.done

  // Solo al cambio di passo: dentro il passo si naviga liberamente.
  const [pathFor, setPathFor] = useState(-1)
  useEffect(() => {
    if (pathFor === index) return
    setPathFor(index)
    navigate(step.path(state))
  }, [pathFor, index, navigate, step, state])

  const autoAdvance = step.autoAdvance ?? true
  useEffect(() => {
    if (!waitsForAction || !done || !autoAdvance || isLastStep(index)) return
    const timer = setTimeout(() => setIndex(index + 1), 400)
    return () => clearTimeout(timer)
  }, [waitsForAction, done, autoAdvance, index])

  function finish({ toSignup }: { toSignup: boolean }) {
    markTourSeen()
    closeSandbox({ toSignup })
  }

  return (
    <TourOverlay target={step.target} label="Tour di benvenuto">
      <div className="tour-top">
        <small className="muted">
          {index + 1} di {TOUR_STEPS.length}
        </small>
        {!isLastStep(index) && (
          <button type="button" className="btn-link" onClick={() => finish({ toSignup: false })}>
            Salta
          </button>
        )}
      </div>
      <h2>{review && isLastStep(index) ? 'Tutto chiaro' : step.title}</h2>
      <p>{review && isLastStep(index) ? 'Ora sai come funziona. Torna all’app per ritrovare le tue camere.' : step.body}</p>
      <div className="tour-actions">
        {index > 0 && !isLastStep(index) && (
          <button type="button" className="btn-ghost" onClick={() => setIndex(index - 1)}>
            Indietro
          </button>
        )}
        {isLastStep(index) ? (
          <button type="button" onClick={() => finish({ toSignup: !review })}>
            {review ? 'Torna all’app' : 'Crea il tuo account'}
          </button>
        ) : (
          (!waitsForAction || (done && !autoAdvance)) && (
            <button type="button" onClick={() => setIndex(index + 1)}>
              Avanti
            </button>
          )
        )}
      </div>
    </TourOverlay>
  )
}
