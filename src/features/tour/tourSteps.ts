import { SANDBOX_ROOM_ID, SANDBOX_USER_ID, type SandboxState } from '../sandbox/sandboxDataApi'

// Passi del tour guidato come dati: schermata (percorso nella sandbox),
// elemento da evidenziare (selettore CSS, di solito un data-tour), testo,
// ed eventuale azione
// richiesta. Un passo con `doneWhen` non ha "Avanti": va avanti da solo
// quando l'azione è fatta (lo stato della sandbox lo dice).

export interface TourStep {
  id: string
  path: (state: SandboxState) => string
  target?: string
  title: string
  body: string
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
    title: 'Benvenuto in Chat Famiglia',
    body: 'Ti mostro in pochi passi come funziona, con una famiglia d’esempio. Niente di quello che fai qui viene salvato.',
  },
  {
    id: 'signup',
    path: () => '/signup',
    target: tourTarget('signup-submit'),
    title: 'Crea il tuo account',
    body: 'Servono solo email e password. Qui è tutto finto e già compilato: tocca "Crea account".',
    doneWhen: (state) => state.signedUp,
  },
  {
    id: 'profile',
    path: () => '/complete-profile',
    target: tourTarget('profile-form'),
    title: 'Il tuo profilo',
    body: 'Scegli il nome con cui la famiglia ti vedrà e, se vuoi, una foto. Tocca "Continua".',
    doneWhen: (state) => state.profile !== null,
  },
  {
    id: 'create-room',
    path: () => '/rooms',
    target: tourTarget('create-room'),
    title: 'Crea una camera',
    body: 'Una camera è una chat per una parte della famiglia. Scrivi un nome (per esempio "Cugini") e tocca "Crea camera".',
    doneWhen: (state) => createdRoomId(state) !== undefined,
  },
  {
    id: 'invite',
    path: (state) => `/rooms/${createdRoomId(state) ?? SANDBOX_ROOM_ID}/info`,
    target: tourTarget('invites'),
    title: 'Invita qualcuno',
    body: 'Tocca "Genera nuovo invito": manda il codice a chi vuoi far entrare, lo scriverà in "Codice invito".',
    doneWhen: (state) => state.invites.length > 0,
    autoAdvance: false,
  },
  {
    id: 'send',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    target: tourTarget('composer'),
    title: 'Scrivi un messaggio',
    body: 'Questa è la camera "Famiglia" d’esempio, con la nonna e Mihai. Scrivi qualcosa e invialo.',
    doneWhen: (state) => ownMessageCount(state) > 0,
  },
  {
    id: 'translation',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    // Tutta la bolla del messaggio tradotto, compreso "Correggi".
    target: `.bubble:has(${tourTarget('translated')})`,
    title: 'Traduzione automatica',
    body: 'Mihai scrive in rumeno, ma tu lo leggi già nella tua lingua. Se una traduzione non ti convince, tocca "Correggi".',
  },
  {
    id: 'delete',
    path: () => `/rooms/${SANDBOX_ROOM_ID}`,
    target: tourTarget('delete-message'),
    title: 'Cancellare un messaggio',
    body: 'Hai sbagliato? Tocca "Elimina" sotto il tuo messaggio: sparisce per tutti.',
    doneWhen: (state) => ownMessageCount(state) === 0,
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
