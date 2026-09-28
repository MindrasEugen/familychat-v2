import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SandboxApp } from './features/sandbox/SandboxApp'
import { useSandboxMode } from './features/sandbox/sandboxMode'
import { TourApp } from './features/tour/TourApp'

// Interruttore tra app vera e sandbox (tour/demo). React Router non ammette
// un router dentro un altro, e la sandbox deve comunque sostituire l'app
// vera (niente query, realtime o sessione attivi mentre si prova): quindi
// si sceglie qui, sopra entrambi i router.
export function Root() {
  const mode = useSandboxMode((state) => state.mode)

  if (mode === 'tour') return <TourApp />
  // Demo libera: stessa sandbox del tour, già con profilo, senza passi.
  if (mode === 'demo') return <SandboxApp withProfile initialPath="/rooms" />

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
