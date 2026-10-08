import { describe, expect, it } from 'vitest'
import { dayKey, formatDayLabel } from './dayDividers'

// Date in ora locale: i separatori seguono il calendario del dispositivo.
const iso = (...parts: [number, number, number, number?, number?]) =>
  new Date(parts[0], parts[1], parts[2], parts[3] ?? 12, parts[4] ?? 0).toISOString()

describe('giorno di un messaggio', () => {
  it('stesso giorno locale → stessa chiave, mezzanotte la cambia', () => {
    expect(dayKey(iso(2026, 9, 8, 0, 1))).toBe(dayKey(iso(2026, 9, 8, 23, 59)))
    expect(dayKey(iso(2026, 9, 8, 23, 59))).not.toBe(dayKey(iso(2026, 9, 9, 0, 1)))
  })
})

describe('etichetta del separatore', () => {
  const now = new Date(2026, 9, 8, 0, 10)

  it('oggi e ieri per giorno di calendario, non per 24 ore', () => {
    expect(formatDayLabel(iso(2026, 9, 8, 0, 5), now)).toBe('Oggi')
    expect(formatDayLabel(iso(2026, 9, 7, 23, 50), now)).toBe('Ieri')
    expect(formatDayLabel(iso(2026, 9, 7, 8, 0), now)).toBe('Ieri')
  })

  it("nell'ultima settimana il giorno, poi la data", () => {
    const weekday = new Date(2026, 9, 5).toLocaleDateString([], { weekday: 'long' })
    expect(formatDayLabel(iso(2026, 9, 5), now)).toBe(weekday.charAt(0).toUpperCase() + weekday.slice(1))
    expect(formatDayLabel(iso(2026, 8, 28), now)).toBe(
      new Date(2026, 8, 28).toLocaleDateString([], { day: 'numeric', month: 'long' }),
    )
  })

  it("l'anno solo se diverso, il futuro come oggi", () => {
    expect(formatDayLabel(iso(2025, 11, 31), now)).toContain('2025')
    expect(formatDayLabel(iso(2026, 9, 9), now)).toBe('Oggi')
  })
})
