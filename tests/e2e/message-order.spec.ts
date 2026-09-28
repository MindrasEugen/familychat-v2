import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Ordine dei messaggi con lo stesso created_at (capita davvero: due persone
// che scrivono nello stesso microsecondo). App e database devono metterli
// nello stesso ordine: created_at, poi id. Qui i due messaggi hanno orario
// identico e id scelti apposta (inseriti prima quello con l'id più alto),
// così il risultato non dipende dal caso. Camera e account di prova di
// lesson10.spec.ts; la paginazione crea una camera sua e la elimina.
const env = { ...readEnvFile('.env.local'), ...process.env }
const roomId = env.E2E_ROOM_ID
const password = env.E2E_PASSWORD

test.skip(!roomId || !password || !env.E2E_EMAIL_A || !env.E2E_EMAIL_B, 'variabili E2E_* non impostate')
test.describe.configure({ timeout: 120_000 })

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

// Testi di sole cifre: non passano dalla traduzione, il confronto è esatto.
function newRunId() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Uuid validi con la prima cifra scelta: "0..." viene prima di "f...".
function uuidStartingWith(first: string) {
  return first + crypto.randomUUID().slice(1)
}

async function apiClient(email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password: password as string })
  if (error) throw error
  return { client, userId: data.user.id }
}

async function dbBodies(client: SupabaseClient, room: string, runId: string): Promise<string[]> {
  const { data, error } = await client
    .from('AAA3_chat_messages')
    .select('body')
    .eq('room_id', room)
    .like('body', `${runId} %`)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data.map((row) => row.body as string)
}

async function pageBodies(page: Page, runId: string): Promise<string[]> {
  const texts = await page.locator('.message-list .msg').allInnerTexts()
  const pattern = new RegExp(`${runId} \\d{3}`)
  return texts.map((text) => pattern.exec(text)?.[0]).filter((body): body is string => Boolean(body))
}

async function openRoom(page: Page, email: string, room: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
  await page.goto(`/rooms/${room}`)
  await expect(page.getByLabel('Messaggio')).toBeVisible()
}

test('due messaggi con lo stesso orario: stesso ordine (created_at, poi id) in app e nel database', async ({ page }) => {
  const runId = newRunId()
  const sender = await apiClient(env.E2E_EMAIL_B as string)
  await openRoom(page, env.E2E_EMAIL_A as string, roomId as string)

  // Realtime attivo prima dei due messaggi.
  const { error: probeError } = await sender.client
    .from('AAA3_chat_messages')
    .insert({ room_id: roomId, sender_id: sender.userId, body: `${runId} 000` })
  if (probeError) throw probeError
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual([`${runId} 000`])

  // Stesso created_at (nel futuro, così sono gli ultimi della camera),
  // inserito prima quello con l'id più alto.
  const sameTime = new Date(Date.now() + 60_000).toISOString()
  for (const [id, body] of [
    [uuidStartingWith('f'), `${runId} 002`],
    [uuidStartingWith('0'), `${runId} 001`],
  ]) {
    const { error } = await sender.client
      .from('AAA3_chat_messages')
      .insert({ id, room_id: roomId, sender_id: sender.userId, body, created_at: sameTime })
    if (error) throw error
  }

  const expected = [`${runId} 000`, `${runId} 001`, `${runId} 002`]
  expect(await dbBodies(sender.client, roomId as string, runId)).toEqual(expected)
  // Arrivati via realtime nell'ordine opposto: l'app li riordina.
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
  // Caricati da capo dal database: stesso ordine.
  await page.reload()
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
})
