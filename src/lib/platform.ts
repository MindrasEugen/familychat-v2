import { Capacitor } from '@capacitor/core'

// Rilevamento del dispositivo condiviso da notifiche push e installazione
// dell'app.

// iPhone/iPad (anche l'iPad che si presenta come Mac con il touch).
export function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// App Android nativa (Capacitor), non browser né PWA.
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

// Aperta come app installata (schermata Home / app del sistema, o l'app
// Android nativa), non in una scheda del browser.
export function isStandalone() {
  // navigator.standalone esiste solo su Safari iOS (non è nei tipi DOM).
  return (
    isNativeApp() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Indirizzo pubblico della versione web, per i link che devono aprirsi nel
// browser anche dall'app nativa (es. reset password dall'email).
export const WEB_APP_ORIGIN = 'https://familychat-v2.onrender.com'
