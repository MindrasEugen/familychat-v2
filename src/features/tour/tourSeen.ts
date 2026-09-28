// "Tour già visto su questo dispositivo" prima di avere un account: vive
// solo in localStorage (nessuna richiesta). Dopo la registrazione vera si
// copia in tutorial_seen_at del profilo (vedi useCompleteProfile).
const TOUR_SEEN_KEY = 'familychat-tour-seen'

export function isTourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) !== null
  } catch {
    return false
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, new Date().toISOString())
  } catch {
    // Senza localStorage (navigazione privata bloccata) il tour ripartirà:
    // meglio che bloccare l'accesso.
  }
}
