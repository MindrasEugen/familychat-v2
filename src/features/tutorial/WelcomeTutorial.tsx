import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import { BellIcon, CameraIcon, ChatIcon, TranslateIcon, UserIcon } from '../../components/icons'
import { useAuthStatus } from '../auth/useAuthStatus'
import { useMarkTutorialSeen } from '../auth/useProfile'
import { getTutorialLang, getTutorialTexts, TUTORIAL_STEP_ORDER, type TutorialStepId } from './tutorialTexts'

const STEP_ICONS: Record<TutorialStepId, ComponentType<SVGProps<SVGSVGElement>>> = {
  rooms: ChatIcon,
  chat: CameraIcon,
  translation: TranslateIcon,
  notifications: BellIcon,
  account: UserIcon,
}

// Schede a scorrimento in un <dialog> modale. "Salta", "Inizia" ed Esc
// chiudono tutti allo stesso modo (onDone).
export function TutorialDialog({ onDone }: { onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const lang = getTutorialLang()
  const texts = getTutorialTexts(lang)

  // Esc chiude il dialog nativo (evento "close") e i pulsanti chiamano
  // finish direttamente: la guardia evita che onDone parta due volte (e che
  // il tutorial venga salvato due volte come visto).
  const doneRef = useRef(false)
  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // Niente dialog.close() allo smontaggio: togliere il dialog dalla pagina
    // lo rimuove già dal livello modale. Chiamarlo farebbe partire un evento
    // "close" in ritardo, che in sviluppo (StrictMode monta, smonta e
    // rimonta) chiuderebbe il dialog appena aperto.
  }, [])

  const stepId = TUTORIAL_STEP_ORDER[stepIndex]
  const step = texts.steps[stepId]
  const StepIcon = STEP_ICONS[stepId]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TUTORIAL_STEP_ORDER.length - 1

  return (
    <dialog ref={dialogRef} className="tutorial" lang={lang} aria-label={texts.dialogLabel} onClose={finish}>
      <div className="tutorial-card">
        <div className="tutorial-top">
          <span className="tutorial-icon" aria-hidden="true">
            <StepIcon />
          </span>
          {!isLast && (
            <button type="button" className="btn-link" onClick={finish}>
              {texts.skip}
            </button>
          )}
        </div>

        <div className="tutorial-text" aria-live="polite">
          <h2>{step.title}</h2>
          <p>{step.body}</p>
        </div>

        <div
          className="tutorial-dots"
          role="img"
          aria-label={texts.progress(stepIndex + 1, TUTORIAL_STEP_ORDER.length)}
        >
          {TUTORIAL_STEP_ORDER.map((id, index) => (
            <span key={id} className={index === stepIndex ? 'dot active' : 'dot'} />
          ))}
        </div>

        <div className="tutorial-actions">
          {!isFirst && (
            <button type="button" className="btn-ghost" onClick={() => setStepIndex(stepIndex - 1)}>
              {texts.back}
            </button>
          )}
          <button type="button" onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}>
            {isLast ? texts.start : texts.next}
          </button>
        </div>
      </div>
    </dialog>
  )
}

// Mostrato una sola volta per persona: ai profili appena creati
// (tutorial_seen_at vuoto). Chiuderlo in qualunque modo lo segna come visto.
// Per rivederlo c'è il pulsante nella pagina Account, che NON tocca il
// database.
export function WelcomeTutorial() {
  const { status, session, profile } = useAuthStatus()
  const markSeen = useMarkTutorialSeen(session?.user.id)
  // Chiusura locale immediata, indipendente dall'esito della richiesta: se
  // il salvataggio fallisce il tutorial ricomparirà solo alla prossima
  // apertura dell'app, non subito sopra quello che si sta facendo.
  const [dismissed, setDismissed] = useState(false)

  if (status !== 'authenticated' || !profile || profile.tutorial_seen_at || dismissed) return null

  return (
    <TutorialDialog
      onDone={() => {
        setDismissed(true)
        markSeen.mutate()
      }}
    />
  )
}
