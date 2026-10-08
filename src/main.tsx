import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/nunito-sans'
import './index.css'
import './features/theme/themeStore'
import { initInstallPrompt } from './features/install/installPrompt'
import { initNativeApp } from './lib/nativeApp'
import { Root } from './Root'

// Prima del primo render: l'evento può arrivare già sulla pagina di accesso.
initInstallPrompt()
initNativeApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
