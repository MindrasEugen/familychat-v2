import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSandboxDataApi, createSandboxStore, SANDBOX_ROOM_ID, SANDBOX_USER_ID } from '../sandbox/sandboxDataApi'
import { markTourSeen, tourSeenAt } from './tourSeen'
import { createdRoomId, isLastStep, isStepDone, TOUR_STEPS } from './tourSteps'

function stepById(id: string) {
  const step = TOUR_STEPS.find((candidate) => candidate.id === id)
  if (!step) throw new Error(`passo ${id} mancante`)
  return step
}

describe('passi del tour', () => {
  it('iniziano dal benvenuto, finiscono con l’invito a registrarsi e hanno id unici', () => {
    expect(TOUR_STEPS[0].id).toBe('welcome')
    expect(TOUR_STEPS.at(-1)?.id).toBe('finish')
    expect(isLastStep(TOUR_STEPS.length - 1)).toBe(true)
    expect(new Set(TOUR_STEPS.map((step) => step.id)).size).toBe(TOUR_STEPS.length)
    // Benvenuto e fine non chiedono azioni: si passa sempre con un pulsante.
    expect(TOUR_STEPS[0].doneWhen).toBeUndefined()
    expect(TOUR_STEPS.at(-1)?.doneWhen).toBeUndefined()
  })

  it('ogni azione richiesta risulta fatta solo dopo averla fatta davvero nella sandbox', async () => {
    const store = createSandboxStore({ withProfile: false })
    const api = createSandboxDataApi(store)
    const done = (id: string) => isStepDone(stepById(id), store.getState())

    expect(done('signup')).toBe(false)
    store.setState({ signedUp: true })
    expect(done('signup')).toBe(true)

    expect(done('profile')).toBe(false)
    await api.createProfile(SANDBOX_USER_ID, 'Anna', null, null)
    expect(done('profile')).toBe(true)

    expect(done('create-room')).toBe(false)
    const room = await api.createRoom('Cugini')
    expect(done('create-room')).toBe(true)
    expect(createdRoomId(store.getState())).toBe(room.id)
    // L'invito si fa nella camera appena creata, non in quella d'esempio.
    expect(stepById('invite').path(store.getState())).toBe(`/rooms/${room.id}/info`)

    expect(done('invite')).toBe(false)
    await api.createRoomInvite(room.id, SANDBOX_USER_ID)
    expect(done('invite')).toBe(true)
    expect(stepById('invite').autoAdvance).toBe(false)

    expect(done('send')).toBe(false)
    const message = await api.sendMessage(SANDBOX_ROOM_ID, SANDBOX_USER_ID, 'Ci sono!', [])
    expect(done('send')).toBe(true)

    expect(done('delete')).toBe(false)
    await api.deleteMessage(message.id, [])
    expect(done('delete')).toBe(true)
  })

  it('senza camera creata il passo invito ripiega sulla camera d’esempio', () => {
    const store = createSandboxStore({ withProfile: true })
    expect(stepById('invite').path(store.getState())).toBe(`/rooms/${SANDBOX_ROOM_ID}/info`)
  })
})

describe('sandbox', () => {
  const fetchSpy = vi.fn()
  beforeEach(() => vi.stubGlobal('fetch', fetchSpy))
  afterEach(() => vi.unstubAllGlobals())

  it('traduce i messaggi d’esempio con risposte fisse e lascia il resto com’è, senza rete', async () => {
    const api = createSandboxDataApi(createSandboxStore({ withProfile: true }))

    expect(await api.translate('Vin și eu! Aduc desertul.', 'it')).toEqual({
      translatedText: "Vengo anch'io! Porto il dolce.",
      sourceLang: 'ro',
    })
    expect(await api.translate('Testo scritto da me', 'it')).toEqual({
      translatedText: 'Testo scritto da me',
      sourceLang: 'it',
    })

    await api.correctTranslation({
      sourceText: 'Vin și eu! Aduc desertul.',
      sourceLang: 'ro',
      targetLang: 'it',
      correctedText: 'Vengo anch’io, porto io il dolce.',
      userId: SANDBOX_USER_ID,
    })
    expect((await api.translate('Vin și eu! Aduc desertul.', 'it')).translatedText).toBe('Vengo anch’io, porto io il dolce.')

    await api.getMyRooms()
    await api.getMessages(SANDBOX_ROOM_ID)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ogni sandbox parte dai dati d’esempio: quello che si fa in una non resta nella successiva', async () => {
    const first = createSandboxDataApi(createSandboxStore({ withProfile: true }))
    await first.sendMessage(SANDBOX_ROOM_ID, SANDBOX_USER_ID, 'Solo qui', [])

    const second = createSandboxDataApi(createSandboxStore({ withProfile: true }))
    const bodies = (await second.getMessages(SANDBOX_ROOM_ID)).map((message) => message.body)
    expect(bodies).not.toContain('Solo qui')
  })

  it('la camera d’esempio ha messaggi non letti finché non la si apre', async () => {
    const api = createSandboxDataApi(createSandboxStore({ withProfile: true }))
    expect((await api.getMyRooms())[0].unread_count).toBeGreaterThan(0)
    await api.markRoomRead(SANDBOX_ROOM_ID)
    expect((await api.getMyRooms())[0].unread_count).toBe(0)
  })
})

describe('tour visto su questo dispositivo', () => {
  beforeEach(() => localStorage.clear())

  it('è null finché non viene segnato, poi è una data valida da salvare nel profilo', () => {
    expect(tourSeenAt()).toBeNull()
    markTourSeen()
    expect(Number.isNaN(new Date(tourSeenAt() as string).getTime())).toBe(false)
  })

  it('un valore non valido (es. messo a mano) diventa comunque una data valida', () => {
    localStorage.setItem('familychat-tour-seen', 'e2e')
    expect(Number.isNaN(new Date(tourSeenAt() as string).getTime())).toBe(false)
  })
})
