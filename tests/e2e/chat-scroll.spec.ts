import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// All'apertura di una camera l'ultimo messaggio deve restare visibile anche
// quando, dopo lo scroll iniziale, la lista si allunga: una foto che finisce
// di caricare, o la traduzione che aggiunge "Correggi traduzione" dentro
// l'ultimo messaggio. Progetto Supabase reale, camera e account di prova di
// lesson10.spec.ts (stesse variabili E2E_*).
const env = { ...readEnvFile('.env.local'), ...process.env }
const roomId = env.E2E_ROOM_ID
const password = env.E2E_PASSWORD

test.use({ locale: 'it-IT' })
test.skip(!roomId || !password || !env.E2E_EMAIL_A || !env.E2E_EMAIL_B, 'variabili E2E_* non impostate')

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

// PNG 1x1: nel riquadro della chat viene comunque mostrato grande.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('foto e traduzioni arrivate in ritardo non nascondono gli ultimi messaggi', async ({ page }) => {
  const api = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data: auth, error: authError } = await api.auth.signInWithPassword({
    email: env.E2E_EMAIL_B as string,
    password: password as string,
  })
  if (authError) throw authError

  const path = `${roomId}/${crypto.randomUUID()}.png`
  const upload = await api.storage.from('room-photos').upload(path, PIXEL, { contentType: 'image/png' })
  if (upload.error) throw upload.error
  const runId = String(Math.floor(100000 + Math.random() * 900000))
  for (const [body, imagePaths] of [
    [`${runId} 001`, [path]],
    // Con lettere: passa dalla traduzione, che compare in ritardo.
    [`${runId} ci vediamo domani sera`, []],
  ] as const) {
    const { error } = await api
      .from('AAA3_chat_messages')
      .insert({ room_id: roomId, sender_id: auth.user.id, body, image_paths: [...imagePaths] })
    if (error) throw error
  }

  // Foto e traduzioni arrivano 2 s dopo il resto: lo scroll iniziale
  // avviene prima.
  const late = async (route: import('@playwright/test').Route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route.continue()
  }
  await page.route('**/storage/v1/object/sign/room-photos/**', late)
  await page.route('**/rest/v1/AAA3_translation_memory**', late)
  await page.route('**/functions/v1/translate-message', late)
  // Come Safari su iPhone, che non ha lo "scroll anchoring" di Chrome
  // (altrimenti Chrome compensa da solo la crescita sopra la vista).
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = '* { overflow-anchor: none !important; }'
      document.head.append(style)
    })
  })

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/login')
  await page.getByLabel('Email').fill(env.E2E_EMAIL_A as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
  await page.goto(`/rooms/${roomId}`)

  const photo = page.locator('.msg', { hasText: `${runId} 001` }).locator('img').first()
  await expect(photo).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.waitForTimeout(500)

  const last = page.locator('.msg', { hasText: `${runId} ci vediamo domani sera` })
  await expect(last.getByText('Correggi traduzione')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(500)
  await expect(last).toBeInViewport({ ratio: 1 })
})
