import { SANDBOX_USER_ID, type SandboxState } from '../sandbox/sandboxDataApi'

// Passi del tour guidato come dati: schermata (percorso nella sandbox),
// elemento da evidenziare (attributo data-tour), testo, ed eventuale azione
// richiesta. Un passo con `doneWhen` non ha "Avanti": va avanti da solo
// quando l'azione è fatta (lo stato della sandbox lo dice).

export interface TourStep {
  id: string
  path: (state: SandboxState) => string
  target?: string
  title: string
  body: string
  doneWhen?: (state: SandboxState) => boolean
}

// La camera creata al passo "crea una camera" (la prima fondata da te).
export function createdRoomId(state: SandboxState): string | undefined {
  return state.rooms.find((room) => room.founder_id === SANDBOX_USER_ID)?.id
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    path: () => '/tour',
    title: 'Benvenuto in Chat Famiglia',
    body: 'Ti mostro in pochi passi come funziona, con una famiglia d’esempio. Niente di quello che fai qui viene salvato.',
  },
  {
    id: 'signup',
    path: () => '/signup',
    target: 'signup-submit',
    title: 'Crea il tuo account',
    body: 'Servono solo email e password. Qui è tutto finto e già compilato: tocca "Crea account".',
    doneWhen: (state) => state.signedUp,
  },
  {
    id: 'profile',
    path: () => '/complete-profile',
    target: 'profile-form',
    title: 'Il tuo profilo',
    body: 'Scegli il nome con cui la famiglia ti vedrà e, se vuoi, una foto. Tocca "Continua".',
    doneWhen: (state) => state.profile !== null,
  },
  {
    id: 'finish',
    path: () => '/rooms',
    title: 'Ora tocca a te',
    body: 'Hai visto come funziona. Crea il tuo account vero per entrare nelle camere della tua famiglia.',
  },
]

export function isStepDone(step: TourStep, state: SandboxState): boolean {
  return step.doneWhen ? step.doneWhen(state) : true
}

export function isLastStep(index: number): boolean {
  return index === TOUR_STEPS.length - 1
}
