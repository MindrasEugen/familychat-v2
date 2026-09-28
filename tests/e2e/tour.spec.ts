import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Tour di primo accesso e demo: girano nella sandbox in memoria. Prima della
// registrazione nessuna richiesta deve partire verso Supabase (auth,
// tabelle, storage, Edge Function), dal caricamento della pagina in poi.
const env = { ...readEnvFile('.env.local'), ...process.env }

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

// Dispositivo nuovo: nessun tour visto, nessun account.
test.use({ storageState: { cookies: [], origins: [] }, locale: 'it-IT' })

function recordSupabaseRequests(page: Page) {
  const origin = new URL(env.VITE_SUPABASE_URL as string).origin
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(origin)) requests.push(`${request.method()} ${request.url()}`)
  })
  page.on('websocket', (socket) => {
    if (socket.url().startsWith(origin.replace(/^http/, 'ws'))) requests.push(`WS ${socket.url()}`)
  })
  return requests
}

test('il tour parte al primo accesso e arriva alla registrazione vera senza richieste a Supabase', async ({ page }) => {
  const requests = recordSupabaseRequests(page)
  await page.goto('/login')

  const tour = page.getByRole('dialog', { name: 'Tour di benvenuto' })
  await expect(tour.getByRole('heading', { name: 'Benvenuto in Chat Famiglia' })).toBeVisible()
  await page.screenshot({ path: 'test-results/tour-1.png' })
  await tour.getByRole('button', { name: 'Avanti' }).click()

  await expect(tour.getByRole('heading', { name: 'Crea il tuo account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('anna@esempio.it')
  await page.screenshot({ path: 'test-results/tour-2.png' })
  await page.getByRole('button', { name: 'Crea account' }).click()

  await expect(tour.getByRole('heading', { name: 'Il tuo profilo' })).toBeVisible()
  await page.screenshot({ path: 'test-results/tour-3.png' })
  await page.getByRole('button', { name: 'Continua' }).click()

  await expect(tour.getByRole('heading', { name: 'Ora tocca a te' })).toBeVisible()
  await page.screenshot({ path: 'test-results/tour-4.png' })
  await tour.getByRole('button', { name: 'Crea il tuo account' }).click()

  await expect(page.getByRole('heading', { name: 'Registrati' })).toBeVisible()
  await page.waitForTimeout(1_000)
  expect(requests).toEqual([])

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await expect(tour).toBeHidden()
})
