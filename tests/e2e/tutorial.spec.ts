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
