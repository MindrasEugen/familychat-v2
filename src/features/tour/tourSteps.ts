import { SANDBOX_ROOM_ID, SANDBOX_USER_ID, type SandboxState } from '../sandbox/sandboxDataApi'
import type { TourStepId } from '../tutorial/tutorialTexts'

// Passi del tour guidato come dati: schermata (percorso nella sandbox),
// elemento da evidenziare (selettore CSS, di solito un data-tour) ed
// eventuale azione (i testi, per id, sono in tutorial/tutorialTexts.ts)
// richiesta. Un passo con `doneWhen` non ha "Avanti": va avanti da solo
// quando l'azione è fatta (lo stato della sandbox lo dice).

export interface TourStep {
  id: TourStepId
  path: (state: SandboxState) => string
  target?: string
  doneWhen?: (state: SandboxState) => boolean
  // Ad azione fatta: di default si va avanti da soli; false = resta sul
  // passo con "Avanti" (c'è qualcosa da guardare, es. il codice invito).
  autoAdvance?: boolean
}

// La camera creata al passo "crea una camera" (la prima fondata da te).
function tourTarget(name: string) {
  return `[data-tour="${name}"]`
}

export function createdRoomId(state: SandboxState): string | undefined {
  return state.rooms.find((room) => room.founder_id === SANDBOX_USER_ID)?.id
}

function ownMessageCount(state: SandboxState) {
  return state.messages.filter((message) => message.sender_id === SANDBOX_USER_ID).length
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    path: () => '/tour',
  },
  {
    id: 'signup',
    path: () => '/signup',
    target: tourTarget('signup-submit'),
    doneWhen: (state) => state.signedUp,
  },
  {
    id: 'profile',
    path: () => '/complete-profile',
    target: tourTarget('profile-form'),
    doneWhen: (state) => state.profile !== null,
  },
  {
    id: 'createRoom',
    path: () => '/rooms',
    target: tourTarget('create-room'),
    doneWhen: (state) => createdRoomId(state) !== undefined,
  },
  {
    id: 'invite',
    path: (state) => `/rooms/${createdRoomId(state) ?? SANDBOX_ROOM_ID}/info`,
    target: tourTarget('invites'),
    doneWhen: (state) => state.invites.length > 0,
    autoAdvance: false,
  },
  {
    id: 'send',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    target: tourTarget('composer'),
    doneWhen: (state) => ownMessageCount(state) > 0,
  },
  {
    id: 'translation',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    // Tutta la bolla del messaggio tradotto, compreso "Correggi".
    target: `.bubble:has(${tourTarget('translated')})`,
  },
  {
    id: 'delete',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    target: tourTarget('delete-message'),
    doneWhen: (state) => ownMessageCount(state) === 0,
  },
  {
    id: 'finish',
    path: () => '/rooms',
  },
]

export function isStepDone(step: TourStep, state: SandboxState): boolean {
  return step.doneWhen ? step.doneWhen(state) : true
}

export function isLastStep(index: number): boolean {
  return index === TOUR_STEPS.length - 1
}
