// Separatori per data tra i messaggi di una camera, come nelle app di
// messaggi. Giorni di calendario LOCALI (mezzanotte del dispositivo), non
// differenze di 24 ore: un messaggio delle 23:50 visto alle 00:10 è "Ieri".

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "2026-10-08": chiave del giorno locale, per capire dove cambia la data.
export function dayKey(iso: string) {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Oggi, Ieri, giorno della settimana fino a 6 giorni fa, poi la data (con
// l'anno solo se diverso da quello corrente). Una data nel futuro (orologio
// sballato) conta come oggi.
export function formatDayLabel(iso: string, now: Date = new Date()) {
  const date = new Date(iso)
  // Math.round: con il cambio dell'ora legale tra le due mezzanotti passano
  // 23 o 25 ore, non 24.
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000))

  if (daysAgo <= 0) return 'Oggi'
  if (daysAgo === 1) return 'Ieri'
  if (daysAgo <= 6) return capitalize(date.toLocaleDateString([], { weekday: 'long' }))
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'long' })
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
}
