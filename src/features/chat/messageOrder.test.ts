import { describe, expect, it } from 'vitest'
import { compareMessages, mergeMessages } from './messageOrder'

function message(id: string, created_at: string) {
  return { id, created_at, room_id: 'r', sender_id: 's', body: id, image_paths: [] }
}

const SAME_TIME = '2026-09-28T13:15:17.485677+00:00'

describe('ordine dei messaggi', () => {
  it('a parità di created_at decide l’id, qualunque sia l’ordine di arrivo', () => {
    const low = message('1b0c7c1e-0000-4000-8000-000000000001', SAME_TIME)
    const high = message('f3a2d9e4-0000-4000-8000-000000000002', SAME_TIME)

    expect(mergeMessages([], [high, low]).map((m) => m.id)).toEqual([low.id, high.id])
    expect(mergeMessages([high], [low]).map((m) => m.id)).toEqual([low.id, high.id])
    expect(mergeMessages([low], [high]).map((m) => m.id)).toEqual([low.id, high.id])
  })

  it('created_at viene prima dell’id', () => {
    const earlierHighId = message('ffffffff-0000-4000-8000-000000000000', '2026-09-28T13:15:17.1+00:00')
    const laterLowId = message('00000000-0000-4000-8000-000000000000', '2026-09-28T13:15:17.2+00:00')
    expect(compareMessages(earlierHighId, laterLowId)).toBeLessThan(0)
  })

  it('l’id si confronta carattere per carattere come in Postgres, non con le regole della lingua', () => {
    // localeCompare metterebbe "a..." e "B..." in un ordine diverso da
    // Postgres; gli uuid sono minuscoli, ma il confronto resta byte per byte.
    expect(compareMessages(message('a', SAME_TIME), message('b', SAME_TIME))).toBe(-1)
    expect(compareMessages(message('9', SAME_TIME), message('a', SAME_TIME))).toBe(-1)
    expect(compareMessages(message('a', SAME_TIME), message('a', SAME_TIME))).toBe(0)
  })

  it('orari con un numero diverso di decimali (PostgREST toglie gli zeri finali) restano in ordine di tempo', () => {
    // Come li restituisce PostgREST (e il realtime): stesso fuso, decimali
    // variabili, nessun decimale se i microsecondi sono zero.
    const times = [
      '2026-09-28T10:00:17.5+00:00',
      '2026-09-28T10:00:17+00:00',
      '2026-09-28T10:00:17.480001+00:00',
      '2026-09-28T10:00:17.48+00:00',
      '2026-09-28T10:00:17.479999+00:00',
      '2026-09-28T10:00:17.000001+00:00',
    ]
    const sorted = mergeMessages([], times.map((time, index) => message(`id-${index}`, time))).map((m) => m.created_at)
    expect(sorted).toEqual([
      '2026-09-28T10:00:17+00:00',
      '2026-09-28T10:00:17.000001+00:00',
      '2026-09-28T10:00:17.479999+00:00',
      '2026-09-28T10:00:17.48+00:00',
      '2026-09-28T10:00:17.480001+00:00',
      '2026-09-28T10:00:17.5+00:00',
    ])
  })

  it('lo stesso istante scritto in modi diversi conta come lo stesso orario (decide l’id)', () => {
    // Oggi PostgREST e realtime scrivono sempre "+00:00", ma il formato
    // dipende dal fuso del server: l'ordine non deve dipendere dalla scrittura.
    const variants = [
      '2026-09-28T10:00:17.48+00:00',
      '2026-09-28T10:00:17.480Z',
      '2026-09-28 10:00:17.48+00',
      '2026-09-28T12:00:17.48+02:00',
      '2026-09-28T05:30:17.480000-04:30',
    ]
    for (const other of variants.slice(1)) {
      expect(compareMessages(message('a', variants[0]), message('b', other)), other).toBe(-1)
      expect(compareMessages(message('b', variants[0]), message('a', other)), other).toBe(1)
    }
  })

  it('con fusi diversi conta l’istante, non il testo', () => {
    // 11:00 a Roma d'estate (+02:00) viene prima delle 10:00 UTC.
    const rome = message('z', '2026-09-28T11:00:00+02:00')
    const utc = message('a', '2026-09-28T10:00:00+00:00')
    expect(mergeMessages([], [utc, rome]).map((m) => m.id)).toEqual(['z', 'a'])
  })

  it('un formato sconosciuto non blocca l’ordinamento: si confronta il testo', () => {
    expect(compareMessages(message('b', 'ieri'), message('a', 'oggi'))).toBe(-1)
    expect(compareMessages(message('b', 'boh'), message('a', 'boh'))).toBe(1)
  })

  it('un messaggio arrivato due volte resta uno solo', () => {
    const m = message('1b0c7c1e-0000-4000-8000-000000000001', SAME_TIME)
    expect(mergeMessages([m], [m])).toHaveLength(1)
  })
})
