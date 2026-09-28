// Rilevamento del dispositivo condiviso da notifiche push e installazione
// dell'app.

// iPhone/iPad (anche l'iPad che si presenta come Mac con il touch).
export function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Aperta come app installata (schermata Home / app del sistema), non in una
// scheda del browser.
export function isStandalone() {
  // navigator.standalone esiste solo su Safari iOS (non è nei tipi DOM).
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
