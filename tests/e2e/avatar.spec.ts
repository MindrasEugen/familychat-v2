import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Cambio foto profilo dalla pagina Account, sul progetto Supabase reale con
// l'account di prova A di lesson10.spec.ts (stesse variabili E2E_*).
const env = { ...readEnvFile('.env.local'), ...process.env }
const email = env.E2E_EMAIL_A
const password = env.E2E_PASSWORD

test.skip(!email || !password, 'variabili E2E_* non impostate')

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

// PNG 1x1 valido: basta a passare dalla compressione (createImageBitmap).
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('la foto profilo si può cambiare da Account e la vecchia viene rimossa', async ({ page }) => {
  const api = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data: auth, error: authError } = await api.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  })
  if (authError) throw authError
  const userId = auth.user.id

  const avatarUrl = async () =>
    (await api.from('AAA3_profiles').select('avatar_url').eq('id', userId).single()).data?.avatar_url ?? null
  const storedFiles = async () =>
    ((await api.storage.from('profile-photos').list(userId)).data ?? []).map((file) => `${userId}/${file.name}`)

  await page.goto('/login')
  await page.getByLabel('Email').fill(email as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
  await page.goto('/account')

  const picker = page.locator('label', { hasText: 'Cambia foto' }).locator('input[type=file]')
  const changePhoto = async (previous: string | null) => {
    await picker.setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PIXEL })
    await expect.poll(avatarUrl, { timeout: 20_000 }).not.toBe(previous)
    await expect(page.getByText('Cambia foto')).toBeVisible()
    return (await avatarUrl()) as string
  }

  const first = await changePhoto(await avatarUrl())
  const second = await changePhoto(first)

  // La card dell'account attivo mostra la foto nuova.
  await expect(page.locator(`img[src="${second}"]`).first()).toBeVisible()

  const pathOf = (url: string) => decodeURIComponent(url.split('/object/public/profile-photos/')[1])
  await expect.poll(storedFiles, { timeout: 10_000 }).toEqual([pathOf(second)])
})
