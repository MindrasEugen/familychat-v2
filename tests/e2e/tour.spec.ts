import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

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
  const step = (title: string) => expect(tour.getByRole('heading', { name: title })).toBeVisible()

  await step('Benvenuto in Chat Famiglia')
  await tour.getByRole('button', { name: 'Avanti' }).click()

  await step('Crea il tuo account')
  await expect(page.getByLabel('Email')).toHaveValue('anna@esempio.it')
  await page.getByRole('button', { name: 'Crea account' }).click()

  await step('Il tuo profilo')
  await page.getByRole('button', { name: 'Continua' }).click()

  await step('Crea una camera')
  await page.getByLabel('Nuova camera').fill('Cugini')
  await page.getByRole('button', { name: 'Crea camera' }).click()

  await step('Invita qualcuno')
  await page.getByRole('button', { name: 'Genera nuovo invito' }).click()
  await expect(page.getByRole('status')).toContainText('Nuovo codice')
  await tour.getByRole('button', { name: 'Avanti' }).click()

  await step('Scrivi un messaggio')
  await page.getByLabel('Messaggio').fill('Ci sono anch’io!')
  await page.getByRole('button', { name: 'Invia' }).click()

  await step('Traduzione automatica')
  await expect(page.getByText("Vengo anch'io! Porto il dolce.")).toBeVisible()
  await tour.getByRole('button', { name: 'Avanti' }).click()

  await step('Cancellare un messaggio')
  await page.getByRole('button', { name: 'Elimina' }).click()

  await step('Ora tocca a te')
  await tour.getByRole('button', { name: 'Crea il tuo account' }).click()

  await expect(page.getByRole('heading', { name: 'Registrati' })).toBeVisible()
  await page.waitForTimeout(1_000)
  expect(requests).toEqual([])

  // Tour segnato come visto: ricaricando non riparte.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await expect(tour).toBeHidden()
})

test('"Salta" chiude il tour e lo segna come visto', async ({ page }) => {
  const requests = recordSupabaseRequests(page)
  await page.goto('/login')
  const tour = page.getByRole('dialog', { name: 'Tour di benvenuto' })
  await tour.getByRole('button', { name: 'Salta' }).click()
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
  await expect(tour).toBeHidden()
  expect(requests).toEqual([])
})

// Registrazione vera dopo aver saltato il tour: il profilo nasce già con
// tutorial_seen_at, quindi la guida a schede non compare. Crea un account:
// solo sul Supabase locale (pnpm test:e2e:local), mai sul progetto reale.
test('dopo il tour, la registrazione vera salva tutorial_seen_at e la guida a schede non compare', async ({ page }) => {
  const url = new URL(env.VITE_SUPABASE_URL as string)
  test.skip(!['127.0.0.1', 'localhost'].includes(url.hostname), 'crea un account: solo con Supabase locale')

  const email = `e2e-tour-${Date.now()}@local.test`
  const password = 'e2e-local-password'
  await page.goto('/login')
  await page.getByRole('dialog', { name: 'Tour di benvenuto' }).getByRole('button', { name: 'Salta' }).click()
  await page.getByRole('button', { name: 'Non hai un account? Registrati' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Crea account' }).click()

  await page.getByLabel('Username').fill(`tour_${Date.now()}`)
  await page.getByRole('button', { name: 'Continua' }).click()
  await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
  await page.waitForTimeout(1_000)
  await expect(page.getByRole('dialog', { name: 'Guida di benvenuto' })).toBeHidden()

  const client = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data: auth, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: profile } = await client.from('AAA3_profiles').select('tutorial_seen_at').eq('id', auth.user.id).single()
  expect(profile?.tutorial_seen_at).not.toBeNull()
})

test.describe('demo libera', () => {
  // Tour già visto: si arriva alla pagina di accesso e si sceglie la demo.
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'familychat-tour-seen', value: 'e2e' }] }],
    },
  })

  test('"Prova la demo" apre camere e messaggi d’esempio, si usa e si chiude senza richieste a Supabase', async ({
    page,
  }) => {
    const requests = recordSupabaseRequests(page)
    await page.goto('/login')
    await page.getByRole('button', { name: 'Prova la demo' }).click()

    await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Tour di benvenuto' })).toBeHidden()
    await page.getByRole('link', { name: /Famiglia/ }).click()

    await expect(page.getByText("Vengo anch'io! Porto il dolce.")).toBeVisible()
    await page.getByLabel('Messaggio').fill('Messaggio di prova nella demo')
    await page.getByRole('button', { name: 'Invia' }).click()
    await expect(page.getByText('Messaggio di prova nella demo')).toBeVisible()
    await page.getByRole('button', { name: 'Elimina' }).click()
    await expect(page.getByText('Messaggio di prova nella demo')).toBeHidden()

    await page.getByRole('link', { name: 'Indietro' }).click()
    await page.getByRole('button', { name: 'Esci dalla demo' }).click()
    await expect(page.getByRole('heading', { name: 'Accedi' })).toBeVisible()
    await page.waitForTimeout(1_000)
    expect(requests).toEqual([])

    // Riaprendola si riparte dai dati d'esempio: niente è rimasto.
    await page.getByRole('button', { name: 'Prova la demo' }).click()
    await page.getByRole('link', { name: /Famiglia/ }).click()
    await expect(page.getByText("Perfetto, allora ci vediamo all'una.")).toBeVisible()
    await expect(page.getByText('Messaggio di prova nella demo')).toBeHidden()
  })
})
