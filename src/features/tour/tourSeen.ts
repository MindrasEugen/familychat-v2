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

// Quando è stato visto, da salvare in tutorial_seen_at alla creazione del
// profilo; null se mai visto (o saltato) su questo dispositivo.
export function tourSeenAt(): string | null {
  try {
    const value = localStorage.getItem(TOUR_SEEN_KEY)
    if (value === null) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
  } catch {
    return null
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
