import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissInstall,
  getInstallState,
  initInstallPrompt,
  installCardReplacesPushReminder,
  isInstallDismissed,
  shouldShowInstallCard,
  useInstallPromptStore,
} from './installPrompt'
import { useInstallPrompt } from './useInstallPrompt'

const base = { standalone: false, installedNow: false, hasPromptEvent: false, ios: false }

describe('stato dell’installazione', () => {
  it('già installata vince su tutto', () => {
    expect(getInstallState({ ...base, standalone: true, hasPromptEvent: true, ios: true })).toBe('installed')
    expect(getInstallState({ ...base, installedNow: true, hasPromptEvent: true })).toBe('installed')
  })

  it('con l’evento del browser si può installare', () => {
    expect(getInstallState({ ...base, hasPromptEvent: true })).toBe('installable')
  })

  it('su iOS non installato: istruzioni', () => {
    expect(getInstallState({ ...base, ios: true })).toBe('ios')
  })

  it('senza evento e fuori da iOS: non disponibile', () => {
    expect(getInstallState(base)).toBe('unavailable')
  })
})

describe('evento beforeinstallprompt', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    useInstallPromptStore.setState({ promptEvent: null, installedNow: false })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('viene fermato, salvato, e il pulsante lo usa una volta sola', async () => {
    initInstallPrompt()
    const prompt = vi.fn(async () => {})
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.installState).toBe('installable')

    let outcome: string | undefined
    await act(async () => {
      outcome = await result.current.install()
    })
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(outcome).toBe('accepted')
    expect(result.current.installState).toBe('installed')
  })

  it('appinstalled segna l’app come installata', () => {
    initInstallPrompt()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current.installState).toBe('installed')
  })
})

describe('"Non ora"', () => {
  beforeEach(() => localStorage.clear())

  it('nasconde la scheda per 14 giorni, poi torna', () => {
    const day = 24 * 60 * 60 * 1000
    const now = new Date('2026-09-28T10:00:00Z')
    expect(isInstallDismissed(now)).toBe(false)
    dismissInstall(now)
    expect(isInstallDismissed(new Date(now.getTime() + 13 * day))).toBe(true)
    expect(isInstallDismissed(new Date(now.getTime() + 14 * day + 1))).toBe(false)
  })

  it('la scheda compare solo se c’è qualcosa da fare e non è stata chiusa', () => {
    expect(shouldShowInstallCard('installable', false)).toBe(true)
    expect(shouldShowInstallCard('ios', false)).toBe(true)
    expect(shouldShowInstallCard('installable', true)).toBe(false)
    expect(shouldShowInstallCard('installed', false)).toBe(false)
    expect(shouldShowInstallCard('unavailable', false)).toBe(false)
  })
})

describe('avviso delle notifiche su iPhone', () => {
  it('la scheda di installazione lo sostituisce solo finché l’app non è installata', () => {
    expect(installCardReplacesPushReminder('ios', false)).toBe(true)
    // Installata: l'avviso delle notifiche torna come prima.
    expect(installCardReplacesPushReminder('installed', false)).toBe(false)
    // Scheda chiusa con "Non ora": resta l'avviso delle notifiche.
    expect(installCardReplacesPushReminder('ios', true)).toBe(false)
    // Fuori da iOS convivono.
    expect(installCardReplacesPushReminder('installable', false)).toBe(false)
  })
})
