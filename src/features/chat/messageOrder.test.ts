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

  it('un messaggio arrivato due volte resta uno solo', () => {
    const m = message('1b0c7c1e-0000-4000-8000-000000000001', SAME_TIME)
    expect(mergeMessages([m], [m])).toHaveLength(1)
  })
})
