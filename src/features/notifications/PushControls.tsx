import { useEffect, useState } from 'react'
import { BellIcon, CloseIcon } from '../../components/icons'
import { useDisablePush, useEnablePush, usePushSubscriptionStatus, type PushStatus } from './usePushSubscription'

// Quanto resta visibile l'avviso "notifiche spente" dopo l'apertura della
// lista camere o di una camera, prima di sparire da solo.
const REMINDER_VISIBLE_MS = 8000
// Durata della dissolvenza di uscita: deve coincidere con la transizione di
// .push-reminder.leaving in index.css.
const REMINDER_LEAVE_MS = 400

const REMINDER_TEXT: Record<Exclude<PushStatus, 'subscribed'>, string> = {
  unsubscribed: 'Le notifiche sono spente: attivale per sapere quando ti scrivono.',
  denied: 'Le notifiche sono bloccate: riattivale per questo sito nelle impostazioni del browser.',
  'ios-needs-install':
    'Su iPhone le notifiche arrivano solo dall\'app installata: tocca Condividi → "Aggiungi alla schermata Home" e aprila da lì.',
  unsupported: 'Questo browser non supporta le notifiche.',
}

// Campanella nell'intestazione della lista camere: sfondo rosso quando le
// notifiche sono spente (qualunque sia il motivo), normale quando sono
// attive. Il simbolo resta sempre la stessa campanella: prima una campanella
// barrata per "tocca per spegnere" veniva letta come "sono spente".
export function PushBellButton({
  userId,
  onNeedsExplanation,
  onError,
}: {
  userId: string | undefined
  // Stati in cui toccare non può attivare nulla (permesso bloccato, iPhone
  // non installato, browser senza supporto): si rimostra l'avviso che spiega.
  onNeedsExplanation: () => void
  onError: (message: string | null) => void
}) {
  const statusQuery = usePushSubscriptionStatus(userId)
  const enablePush = useEnablePush(userId)
  const disablePush = useDisablePush(userId)

  const status = statusQuery.data
  if (!status) return null

  const isOn = status === 'subscribed'
  const label = isOn ? 'Notifiche attive: tocca per disattivarle' : 'Notifiche spente: tocca per attivarle'
  const isPending = enablePush.isPending || disablePush.isPending

  function handleClick() {
    onError(null)
    if (status === 'subscribed') {
      disablePush.mutate(undefined, { onError: (error) => onError(error.message) })
    } else if (status === 'unsubscribed') {
      enablePush.mutate(undefined, { onError: (error) => onError(error.message) })
    } else {
      onNeedsExplanation()
    }
  }

  return (
    <button
      type="button"
      className={isOn ? 'icon-btn' : 'icon-btn bell-off'}
      aria-label={label}
      title={label}
      disabled={isPending}
      onClick={handleClick}
    >
      <BellIcon />
    </button>
  )
}

// Avviso in cima alla pagina quando le notifiche sono spente. Si mostra a
// ogni apertura della lista camere o di una camera (è montato lì) e sparisce
// da solo dopo REMINDER_VISIBLE_MS, con una dissolvenza, per non restare
// sempre in mezzo. Si può anche chiudere a mano.
export function PushReminder({ userId }: { userId: string | undefined }) {
  const statusQuery = usePushSubscriptionStatus(userId)
  const enablePush = useEnablePush(userId)
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'gone'>('visible')

  const status = statusQuery.data
  const shouldShow = status !== undefined && status !== 'subscribed'

  // Il conto alla rovescia parte quando l'avviso compare davvero (lo stato
  // arriva dopo una breve attesa), non al montaggio del componente.
  // Fermo mentre si sta attivando o se c'è un errore da leggere.
  const isBusy = enablePush.isPending || enablePush.isError
  useEffect(() => {
    if (!shouldShow || phase !== 'visible' || isBusy) return
    const timer = setTimeout(() => setPhase('leaving'), REMINDER_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [shouldShow, phase, isBusy])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = setTimeout(() => setPhase('gone'), REMINDER_LEAVE_MS)
    return () => clearTimeout(timer)
  }, [phase])

  if (!shouldShow || phase === 'gone') return null

  return (
    <div className={phase === 'leaving' ? 'push-reminder leaving' : 'push-reminder'} role="status">
      <span className="push-reminder-icon" aria-hidden="true">
        <BellIcon />
      </span>
      <div className="push-reminder-text">
        <p>{REMINDER_TEXT[status]}</p>
        {enablePush.isError && <p role="alert">{enablePush.error.message}</p>}
      </div>
      {status === 'unsubscribed' && (
        <button
          type="button"
          onClick={() => enablePush.mutate(undefined, { onSuccess: () => setPhase('leaving') })}
          disabled={enablePush.isPending}
        >
          Attiva
        </button>
      )}
      <button type="button" className="btn-link" aria-label="Chiudi avviso" onClick={() => setPhase('leaving')}>
        <CloseIcon />
      </button>
    </div>
  )
}
