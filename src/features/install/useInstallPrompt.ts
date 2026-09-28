import { currentInstallState, useInstallPromptStore } from './installPrompt'

// Stato dell'installazione e azione "Installa" (solo dove il browser ha dato
// l'evento; l'evento vale una volta sola).
export function useInstallPrompt() {
  const state = useInstallPromptStore()
  const installState = currentInstallState(state)

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const event = state.promptEvent
    if (!event) return 'unavailable'
    useInstallPromptStore.setState({ promptEvent: null })
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') useInstallPromptStore.setState({ installedNow: true })
    return outcome
  }

  return { installState, install }
}
