import { describe, expect, it } from 'vitest'
import { TOUR_STEPS } from '../tour/tourSteps'
import { getTourTexts, getTutorialTexts, type TutorialLang } from './tutorialTexts'

const LANGS: TutorialLang[] = ['it', 'ro', 'en', 'fr']

// Tutte le chiavi (anche annidate) con il loro valore: stringhe, o funzioni
// come progress.
function flatten(value: unknown, prefix = ''): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return { [prefix]: value }
  return Object.entries(value).reduce<Record<string, unknown>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  )
}

// Pulsanti dell'app (solo in italiano) citati nei testi del tour: devono
// comparire identici tra «» in ogni lingua, così chi legge li ritrova sullo
// schermo.
const UI_LABELS = ['Crea account', 'Continua', 'Crea camera', 'Genera nuovo invito', 'Codice invito', 'Famiglia', 'Correggi', 'Elimina']

describe.each([
  ['tour', getTourTexts],
  ['guida a schede', getTutorialTexts],
] as const)('testi: %s', (_name, getTexts) => {
  const italian = flatten(getTexts('it'))

  it.each(LANGS)('in %s ci sono tutte e sole le chiavi dell’italiano, nessuna vuota', (lang) => {
    const texts = flatten(getTexts(lang))
    expect(Object.keys(texts).sort()).toEqual(Object.keys(italian).sort())
    for (const [key, value] of Object.entries(texts)) {
      if (typeof value === 'function') {
        expect(value(2, 9), key).toMatch(/2.*9/)
      } else {
        expect(typeof value, key).toBe('string')
        expect((value as string).trim(), key).not.toBe('')
      }
    }
  })
})

describe('testi del tour', () => {
  it('ogni passo ha titolo e testo in tutte le lingue', () => {
    for (const lang of LANGS) {
      for (const step of TOUR_STEPS) {
        expect(getTourTexts(lang).steps[step.id]?.title, `${lang} ${step.id}`).toBeTruthy()
      }
    }
  })

  it.each(LANGS.filter((lang) => lang !== 'it'))('in %s i nomi dei pulsanti restano in italiano tra «»', (lang) => {
    for (const step of TOUR_STEPS) {
      const italianBody = getTourTexts('it').steps[step.id].body
      const body = getTourTexts(lang).steps[step.id].body
      for (const label of UI_LABELS.filter((candidate) => italianBody.includes(`«${candidate}»`))) {
        expect(body, `${lang} ${step.id}`).toContain(`«${label}»`)
      }
    }
  })
})
