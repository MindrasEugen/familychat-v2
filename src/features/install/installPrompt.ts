import { create } from 'zustand'
import { isIos, isStandalone } from '../../lib/platform'

// Installazione dell'app (PWA). Chrome, Edge e Samsung Internet mandano
// "beforeinstallprompt" quando l'app è installabile, spesso già sulla pagina
// di accesso: lo si intercetta all'avvio (initInstallPrompt in main.tsx) e si
// tiene qui finché dopo il login non compare il pulsante. iOS non ha
// l'evento: lì si mostrano le istruzioni. Nessuna chiamata a Supabase.

// Non è nei tipi DOM.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'installed' | 'installable' | 'ios' | 'unavailable'

interface InstallPromptState {
  promptEvent: BeforeInstallPromptEvent | null
  installedNow: boolean
}

export const useInstallPromptStore = create<InstallPromptState>(() => ({ promptEvent: null, installedNow: false }))

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Niente proposta automatica del browser: il pulsante è nostro.
    event.preventDefault()
    useInstallPromptStore.setState({ promptEvent: event as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => {
    useInstallPromptStore.setState({ promptEvent: null, installedNow: true })
  })
}

export function getInstallState({
  standalone,
  installedNow,
  hasPromptEvent,
  ios,
}: {
  standalone: boolean
  installedNow: boolean
  hasPromptEvent: boolean
  ios: boolean
}): InstallState {
  if (standalone || installedNow) return 'installed'
  if (hasPromptEvent) return 'installable'
  if (ios) return 'ios'
  return 'unavailable'
}

export function currentInstallState(state: InstallPromptState): InstallState {
  return getInstallState({
    standalone: isStandalone(),
    installedNow: state.installedNow,
    hasPromptEvent: state.promptEvent !== null,
    ios: isIos(),
  })
}

// "Non ora" nella lista camere: la scheda torna dopo 14 giorni. Solo
// localStorage, per dispositivo. La sezione in Account lo ignora.
const DISMISS_KEY = 'familychat-install-dismissed'
export const DISMISS_DAYS = 14

export function isInstallDismissed(now: Date = new Date()): boolean {
  try {
    const value = localStorage.getItem(DISMISS_KEY)
    if (!value) return false
    const until = new Date(value).getTime() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    return Number.isNaN(until) ? false : now.getTime() < until
  } catch {
    return false
  }
}

export function dismissInstall(now: Date = new Date()) {
  try {
    localStorage.setItem(DISMISS_KEY, now.toISOString())
  } catch {
    // Senza localStorage la scheda ricomparirà: non è un problema.
  }
}

// Scheda della lista camere: solo se c'è qualcosa da fare e non è stata
// chiusa di recente.
export function shouldShowInstallCard(state: InstallState, dismissed: boolean): boolean {
  return (state === 'installable' || state === 'ios') && !dismissed
}

// Su iPhone non installato la scheda di installazione (che parla anche delle
// notifiche) prende il posto dell'avviso delle notifiche; da installata, o
// se la scheda non c'è, l'avviso delle notifiche resta come prima.
export function installCardReplacesPushReminder(state: InstallState, dismissed: boolean): boolean {
  return state === 'ios' && shouldShowInstallCard(state, dismissed)
}
