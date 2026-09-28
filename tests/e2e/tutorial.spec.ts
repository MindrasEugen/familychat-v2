import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Tutorial di benvenuto al primo avvio, sul progetto Supabase reale con
// l'account di prova C di lesson10.spec.ts (stesse variabili E2E_*). Prima di
// ogni caso il profilo torna "mai visto" (tutorial_seen_at vuoto).
const env = { ...readEnvFile('.env.local'), ...process.env }
const email = env.E2E_EMAIL_C
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

async function api() {
  const client = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email: email as string, password: password as string })
  if (error) throw error
  const seenAt = async () =>
    (await client.from('AAA3_profiles').select('tutorial_seen_at').eq('id', data.user.id).single()).data
      ?.tutorial_seen_at ?? null
  const reset = async () => {
    const { error: resetError } = await client
      .from('AAA3_profiles')
      .update({ tutorial_seen_at: null })
      .eq('id', data.user.id)
    if (resetError) throw resetError
  }
  return { seenAt, reset }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
}

const closers: [string, (page: Page) => Promise<void>][] = [
  ['Salta', (page) => page.getByRole('dialog').getByRole('button', { name: 'Salta' }).click()],
  ['Esc', (page) => page.keyboard.press('Escape')],
  [
    'Inizia',
    async (page) => {
      const dialog = page.getByRole('dialog')
      while (!(await dialog.getByRole('button', { name: 'Inizia' }).isVisible())) {
        await dialog.getByRole('button', { name: 'Avanti' }).click()
      }
      await dialog.getByRole('button', { name: 'Inizia' }).click()
    },
  ],
]

for (const [name, close] of closers) {
  test(`il tutorial compare al primo avvio, "${name}" lo chiude e non ricompare`, async ({ page }) => {
    const profile = await api()
    await profile.reset()

    await login(page)
    const dialog = page.getByRole('dialog', { name: 'Guida di benvenuto' })
    await expect(dialog).toBeVisible()

    await close(page)
    await expect(dialog).toBeHidden()
    await expect.poll(profile.seenAt, { timeout: 10_000 }).not.toBeNull()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Le tue camere' })).toBeVisible()
    await page.waitForTimeout(1_000)
    await expect(dialog).toBeHidden()
  })
}

// Richieste verso Supabase (REST, Auth, Storage, Functions) fatte dalla
// pagina da quando si chiama start(). Il websocket realtime non passa di qui.
function recordSupabaseRequests(page: Page) {
  const origin = new URL(env.VITE_SUPABASE_URL as string).origin
  const requests: string[] = []
  let recording = false
  page.on('request', (request) => {
    if (recording && request.url().startsWith(origin)) requests.push(`${request.method()} ${request.url()}`)
  })
  return {
    requests,
    start: () => {
      recording = true
    },
  }
}

async function stepThrough(page: Page) {
  const dialog = page.getByRole('dialog')
  while (!(await dialog.getByRole('button', { name: 'Inizia' }).isVisible())) {
    await dialog.getByRole('button', { name: 'Avanti' }).click()
  }
  await dialog.getByRole('button', { name: 'Indietro' }).click()
  await dialog.getByRole('button', { name: 'Avanti' }).click()
}

test('scorrere le schede del tutorial non fa richieste a Supabase; chiuderlo salva solo il profilo', async ({
  page,
}) => {
  const profile = await api()
  await profile.reset()

  await login(page)
  const dialog = page.getByRole('dialog', { name: 'Guida di benvenuto' })
  await expect(dialog).toBeVisible()
  await page.waitForLoadState('networkidle')

  const recorder = recordSupabaseRequests(page)
  recorder.start()
  await stepThrough(page)
  await page.waitForTimeout(1_000)
  expect(recorder.requests).toEqual([])

  await dialog.getByRole('button', { name: 'Inizia' }).click()
  await expect.poll(profile.seenAt, { timeout: 10_000 }).not.toBeNull()
  // Il salvataggio viene registrato: il registratore funziona, quindi le
  // liste vuote qui sopra e nel test di Account non sono vuote per caso.
  expect(recorder.requests.some((request) => request.startsWith('PATCH ') && request.includes('/rest/v1/AAA3_profiles'))).toBe(true)
  expect(recorder.requests.filter((request) => !request.includes('/rest/v1/AAA3_profiles'))).toEqual([])
})

// Da Account "Rivedi la guida" apre il tour guidato nella sandbox (prima
// riapriva le schede): finché è aperto non parte nessuna richiesta, e
// tutorial_seen_at non cambia.
test('"Rivedi la guida" da Account apre il tour nella sandbox senza richieste a Supabase', async ({ page }) => {
  const profile = await api()
  await profile.reset()
  await login(page)
  await page.getByRole('dialog', { name: 'Guida di benvenuto' }).getByRole('button', { name: 'Salta' }).click()
  await expect.poll(profile.seenAt, { timeout: 10_000 }).not.toBeNull()
  const seenAt = await profile.seenAt()

  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  const recorder = recordSupabaseRequests(page)
  recorder.start()
  await page.getByRole('button', { name: 'Rivedi la guida' }).click()
  const tour = page.getByRole('dialog', { name: 'Tour di benvenuto' })
  await tour.getByRole('button', { name: 'Avanti' }).click()
  await page.getByRole('button', { name: 'Crea account' }).click()
  await expect(tour.getByRole('heading', { name: 'Il tuo profilo' })).toBeVisible()
  await page.getByRole('button', { name: 'Continua' }).click()
  await expect(tour.getByRole('heading', { name: 'Crea una camera' })).toBeVisible()
  await page.waitForTimeout(1_000)
  // Solo fin qui: chiudendo, l'app vera si rimonta e ricarica i suoi dati.
  expect(recorder.requests).toEqual([])

  await tour.getByRole('button', { name: 'Salta' }).click()
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  expect(await profile.seenAt()).toBe(seenAt)
})
