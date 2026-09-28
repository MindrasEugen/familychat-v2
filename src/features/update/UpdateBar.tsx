import { getAppTexts } from '../install/installTexts'
import { useNewVersionAvailable } from './versionCheck'

// Barretta "nuova versione": montata solo nell'app vera (App.tsx), quindi
// mai nel tour e nella demo, dove l'app vera è smontata.
export function UpdateBar() {
  const available = useNewVersionAvailable()
  const texts = getAppTexts().update

  if (!available) return null

  return (
    <div className="update-bar" role="status">
      <span>{texts.available}</span>
      <button type="button" onClick={() => window.location.reload()}>
        {texts.reload}
      </button>
    </div>
  )
}
