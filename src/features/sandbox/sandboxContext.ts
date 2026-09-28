import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { SandboxState, SandboxStore } from './sandboxDataApi'

export interface Sandbox {
  store: SandboxStore
}

export const SandboxStoreContext = createContext<SandboxStore | null>(null)

// Stato della sandbox aperta, per le schermate che esistono solo nel tour
// (es. la registrazione finta) e per il tour stesso.
export function useSandboxStore<T>(selector: (state: SandboxState) => T): T {
  const store = useContext(SandboxStoreContext)
  if (!store) throw new Error('useSandboxStore fuori dalla sandbox')
  return useStore(store, selector)
}

export function useSandboxStoreApi(): SandboxStore {
  const store = useContext(SandboxStoreContext)
  if (!store) throw new Error('useSandboxStoreApi fuori dalla sandbox')
  return store
}
