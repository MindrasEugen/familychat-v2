import { create } from 'zustand'
import {
  ACCOUNT_SLOTS,
  MAX_ACCOUNTS,
  getClientForSlot,
  setActiveClientSlot,
  type AccountSlot,
} from '../../lib/supabaseClient'
import { initSessionListener } from './sessionStore'

const STORAGE_KEY = 'familychat.accounts.v1'

export interface KnownAccount {
  slot: AccountSlot
  userId: string
  // Riempiti in un secondo momento (vedi syncActiveAccountProfile in
  // App.tsx) non appena il profilo dell'account attivo è disponibile — al
  // momento della registrazione (subito dopo il login) non li conosciamo
  // ancora. null finché non risolti almeno una volta.
  username: string | null
  avatarUrl: string | null
}

interface PersistedShape {
  accounts: KnownAccount[]
  activeSlot: AccountSlot
}

interface AccountsState {
  accounts: KnownAccount[]
  activeSlot: AccountSlot
}

function loadPersisted(): PersistedShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedShape
    if (!Array.isArray(parsed.accounts) || !ACCOUNT_SLOTS.includes(parsed.activeSlot)) return null
    return parsed
  } catch {
    return null
  }
}

function persist(state: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage pieno/non disponibile (es. navigazione privata): il device
    // semplicemente non ricorderà gli account tra un riavvio e l'altro,
    // niente di più grave — non un errore da bloccare l'utente.
  }
}

export const useAccountsStore = create<AccountsState>(() => ({
  accounts: [],
  activeSlot: ACCOUNT_SLOTS[0],
}))

// Disiscrive il listener di sessione precedente prima di risottoscriverne
// uno nuovo legato al client (ora) attivo — vedi il commento su
// setActiveClientSlot in supabaseClient.ts: cambiare solo il target del
// proxy non fa ripartire da sé onAuthStateChange, serve chiamarlo di nuovo
// esplicitamente ad ogni cambio di slot attivo.
let unsubscribeSessionListener: (() => void) | null = null
function rebindSessionListener() {
  unsubscribeSessionListener?.()
  unsubscribeSessionListener = initSessionListener()
}

// Chiamata una sola volta all'avvio (vedi App.tsx). Allinea il client
// "attivo" allo stato persistito prima di far partire il listener di
// sessione, così la UI non lampeggia su un account sbagliato per un
// istante.
export function initAccounts() {
  const persisted = loadPersisted()
  const initialSlot = persisted?.activeSlot ?? ACCOUNT_SLOTS[0]

  setActiveClientSlot(initialSlot)
  useAccountsStore.setState({ accounts: persisted?.accounts ?? [], activeSlot: initialSlot })
  rebindSessionListener()

  return () => unsubscribeSessionListener?.()
}

export function canAddAccount(): boolean {
  return useAccountsStore.getState().accounts.length < MAX_ACCOUNTS
}

// Il prossimo slot libero da usare per "Aggiungi account", o null se il
// limite (2, su richiesta esplicita dell'utente) è già raggiunto.
export function nextFreeSlot(): AccountSlot | null {
  const used = new Set(useAccountsStore.getState().accounts.map((a) => a.slot))
  return ACCOUNT_SLOTS.find((slot) => !used.has(slot)) ?? null
}

// Registra un account come "conosciuto su questo dispositivo" dopo un
// login/registrazione riuscito su un dato slot (chiamato sia dal login
// normale sullo slot già attivo, sia da AddAccountPage su un nuovo slot).
// Idempotente: se lo slot esiste già (es. token scaduto e poi rifatto il
// login sullo stesso slot) aggiorna la riga invece di duplicarla.
export function registerAccount(slot: AccountSlot, userId: string) {
  const { accounts } = useAccountsStore.getState()
  const existing = accounts.find((a) => a.slot === slot)
  const nextAccounts = existing
    ? accounts.map((a) => (a.slot === slot ? { ...a, userId } : a))
    : [...accounts, { slot, userId, username: null, avatarUrl: null }]

  useAccountsStore.setState({ accounts: nextAccounts })
  persist({ accounts: nextAccounts, activeSlot: useAccountsStore.getState().activeSlot })
}

// Tiene aggiornate le etichette (username/avatar) mostrate nello switcher
// per l'account ATTUALMENTE attivo — non query aggiuntive verso gli slot
// inattivi, solo sincronizzazione di ciò che l'app carica comunque per sé
// stessa (vedi l'effect in App.tsx che la chiama da useAuthStatus().profile).
export function updateActiveAccountProfile(username: string | null, avatarUrl: string | null) {
  const { accounts, activeSlot } = useAccountsStore.getState()
  const nextAccounts = accounts.map((a) => (a.slot === activeSlot ? { ...a, username, avatarUrl } : a))
  useAccountsStore.setState({ accounts: nextAccounts })
  persist({ accounts: nextAccounts, activeSlot })
}

// Passa a un account già conosciuto sul dispositivo — nessuna nuova
// autenticazione: la sessione di quello slot è già presente in
// localStorage (o verrà scoperta assente, riportando "guest" per quello
// slot, caso raro ma gestito senza crash — vedi nota in NOTE.md).
export function switchActiveAccount(slot: AccountSlot) {
  if (!useAccountsStore.getState().accounts.some((a) => a.slot === slot)) return

  setActiveClientSlot(slot)
  useAccountsStore.setState({ activeSlot: slot })
  persist({ accounts: useAccountsStore.getState().accounts, activeSlot: slot })
  rebindSessionListener()
}

// "Esci" in un mondo multi-account: dimentica QUESTO account su QUESTO
// dispositivo (non solo "nascondilo") — coerente con l'aspettativa che
// l'utente ha di un logout. Se resta un altro account noto, diventa lui
// il nuovo attivo (nessuna schermata di login se non serve); altrimenti si
// torna allo stato "nessun account", di fatto un ospite sullo slot di
// default.
export async function removeAccount(slot: AccountSlot) {
  const client = getClientForSlot(slot)
  await client.auth.signOut().catch(() => {
    // Anche se la revoca lato server fallisce (es. rete assente), l'account
    // va comunque dimenticato localmente: non deve restare bloccato nello
    // switcher senza modo di uscirne.
  })

  const { accounts, activeSlot } = useAccountsStore.getState()
  const remaining = accounts.filter((a) => a.slot !== slot)
  const nextActiveSlot = activeSlot === slot ? (remaining[0]?.slot ?? ACCOUNT_SLOTS[0]) : activeSlot

  useAccountsStore.setState({ accounts: remaining, activeSlot: nextActiveSlot })
  persist({ accounts: remaining, activeSlot: nextActiveSlot })

  if (activeSlot === slot) {
    setActiveClientSlot(nextActiveSlot)
    rebindSessionListener()
  }
}
