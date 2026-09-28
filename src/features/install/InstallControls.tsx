import { getAppTexts } from './installTexts'
import type { InstallState } from './installPrompt'
import { useInstallPrompt } from './useInstallPrompt'

// Scheda "Installa l'app" in cima alla lista camere (chi la mostra decide
// quando: vedi shouldShowInstallCard). Su iOS niente pulsante: istruzioni.
export function InstallCard({ state, onDismiss }: { state: InstallState; onDismiss: () => void }) {
  const { install } = useInstallPrompt()
  const texts = getAppTexts().install
  const isIos = state === 'ios'

  return (
    <div className="card install-card" role="region" aria-label={isIos ? texts.iosTitle : texts.title}>
      <b>{isIos ? texts.iosTitle : texts.title}</b>
      <p className="muted">{isIos ? texts.iosBody : texts.body}</p>
      <div className="row">
        {!isIos && (
          <button type="button" onClick={() => void install()}>
            {texts.button}
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onDismiss}>
          {texts.dismiss}
        </button>
      </div>
    </div>
  )
}

// Punto fisso in Account: sempre presente, ignora "Non ora".
export function InstallSection() {
  const { installState, install } = useInstallPrompt()
  const texts = getAppTexts().install

  return (
    <div className="card">
      <span className="section-label">{texts.accountLabel}</span>
      {installState === 'installable' && (
        <>
          <p className="muted">{texts.body}</p>
          <button type="button" onClick={() => void install()}>
            {texts.button}
          </button>
        </>
      )}
      {installState === 'ios' && <p className="muted">{texts.iosBody}</p>}
      {installState === 'installed' && <p className="muted">{texts.installed}</p>}
      {installState === 'unavailable' && <p className="muted">{texts.unavailable}</p>}
    </div>
  )
}
