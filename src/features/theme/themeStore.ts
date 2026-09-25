import { create } from 'zustand'

export type Theme = 'dark' | 'light'

// Stessa chiave letta dallo script inline in index.html, che applica il tema
// prima che React parta (altrimenti chi ha scelto il chiaro vedrebbe un
// lampo scuro a ogni apertura).
const STORAGE_KEY = 'familychat.theme'
const DEFAULT_THEME: Theme = 'dark'

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // Colore della barra di sistema su mobile/PWA, allineato allo sfondo
  // (--bg in index.css).
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#1b1614' : '#fbf5f1')
}

interface ThemeState {
  theme: Theme
}

export const useThemeStore = create<ThemeState>(() => ({ theme: loadTheme() }))

applyTheme(useThemeStore.getState().theme)

export function setTheme(theme: Theme) {
  useThemeStore.setState({ theme })
  applyTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage non disponibile: il tema vale solo per questa sessione.
  }
}
