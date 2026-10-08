import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { createMessagesChannel } from '../features/notifications/nativePush'

// Comportamenti che valgono solo dentro l'app Android (Capacitor), non nel
// browser. Chiamato una volta all'avvio (main.tsx).
export function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  // Senza questo listener il tasto "indietro" di Android chiude subito
  // l'app invece di tornare alla pagina precedente.
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void CapacitorApp.exitApp()
  })

  // Il canale delle notifiche deve esistere prima che ne arrivi una: se
  // manca, Android usa quello generico di Firebase ("Varie"), senza banner.
  createMessagesChannel().catch(() => {})
}
