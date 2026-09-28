import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Pulsante "Installa" (PWA). beforeinstallprompt non si può far partire
// davvero in un browser automatizzato: lo si simula con un evento finto che
// ha prompt() e userChoice, come quello di Chrome.
const env = { ...readEnvFile('.env.local'), ...process.env }
const email = env.E2E_EMAIL_A
const password = env.E2E_PASSWORD

test.skip(!email || !password, 'variabili E2E_* non impostate')
test.use({ locale: 'it-IT' })

function readEnvFile(path: string): Record<string, string> {
  if (!fs.existsSync(path)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
  )
}

async function fireInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => {
        ;(window as unknown as { promptCalls: number }).promptCalls =
          ((window as unknown as { promptCalls?: number }).promptCalls ?? 0) + 1
      },
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    })
    window.dispatchEvent(event)
  })
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
}

const card = (page: Page) => page.getByRole('region', { name: 'Installa Chat Famiglia' })

test('dopo il login compare «Installa», che apre la richiesta del browser e poi sparisce', async ({ page }) => {
  // L'evento arriva già sulla pagina di accesso: deve restare per dopo.
  await page.goto('/login')
  await fireInstallPrompt(page)
  await page.getByLabel('Email').fill(email as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()

  await expect(card(page)).toBeVisible()
  await card(page).getByRole('button', { name: 'Installa' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { promptCalls?: number }).promptCalls)).toBe(1)
  await expect(card(page)).toBeHidden()

  await page.getByRole('link', { name: 'Account' }).click()
  await expect(page.getByText('L’app è già installata su questo dispositivo.')).toBeVisible()
})

test('«Non ora» nasconde la scheda anche dopo un ricaricamento, ma Account la offre sempre', async ({ page }) => {
  await login(page)
  await fireInstallPrompt(page)
  await card(page).getByRole('button', { name: 'Non ora' }).click()
  await expect(card(page)).toBeHidden()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
  await fireInstallPrompt(page)
  await page.waitForTimeout(500)
  await expect(card(page)).toBeHidden()

  await page.getByRole('link', { name: 'Account' }).click()
  await expect(page.getByText('App sul telefono')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Installa' })).toBeVisible()
})

test.describe('tour e demo', () => {
  // Dispositivo nuovo: il tour parte da solo.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('la scheda non compare mai durante tour e demo', async ({ page }) => {
    await page.goto('/login')
    await fireInstallPrompt(page)
    const tour = page.getByRole('dialog', { name: 'Tour di benvenuto' })
    await tour.getByRole('button', { name: 'Avanti' }).click()
    await page.getByRole('button', { name: 'Crea account' }).click()
    await page.getByRole('button', { name: 'Continua' }).click()
    // Lista camere della sandbox, con l'evento già salvato.
    await expect(tour.getByRole('heading', { name: 'Crea una camera' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
    await expect(card(page)).toBeHidden()

    await tour.getByRole('button', { name: 'Salta' }).click()
    await page.getByRole('button', { name: 'Prova la demo' }).click()
    await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
    await fireInstallPrompt(page)
    await page.waitForTimeout(500)
    await expect(card(page)).toBeHidden()
  })
})

test.describe('iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  test('non installata: istruzioni al posto dell’avviso delle notifiche', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('region', { name: 'Aggiungila alla schermata Home' })).toBeVisible()
    await page.waitForTimeout(1_500)
    await expect(page.locator('.push-reminder')).toBeHidden()
  })

  test('installata: niente istruzioni, l’avviso delle notifiche torna come prima', async ({ page }) => {
    // Aperta dalla schermata Home.
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window)
      window.matchMedia = (query: string) =>
        query === '(display-mode: standalone)' ? ({ ...original(query), matches: true } as MediaQueryList) : original(query)
    })
    await login(page)
    await expect(page.locator('.push-reminder')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Aggiungila alla schermata Home' })).toBeHidden()
  })
})
