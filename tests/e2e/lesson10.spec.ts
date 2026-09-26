import fs from 'node:fs'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lezione 10 (PROMPT_REACT_REWRITE.md): nessun messaggio perso o fuori
// ordine con più utenti che scrivono insieme e una sottoscrizione realtime
// attiva. Gira sul progetto Supabase reale, in una camera di prova con tre
// account usa e getta — senza queste variabili il test viene saltato:
//   E2E_ROOM_ID, E2E_PASSWORD, E2E_EMAIL_A, E2E_EMAIL_B, E2E_EMAIL_C
// (tutti e tre membri della camera, profilo completo, tutorial già visto).
const env = { ...readEnvFile('.env.local'), ...process.env }
const roomId = env.E2E_ROOM_ID
const password = env.E2E_PASSWORD
const emails = [env.E2E_EMAIL_A, env.E2E_EMAIL_B, env.E2E_EMAIL_C]

test.skip(!roomId || !password || emails.some((email) => !email), 'variabili E2E_* non impostate')
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

// Testi di sole cifre: senza lettere non passano dalla traduzione
// (MessageBody li mostra così come sono), quindi il confronto è esatto.
function newRunId() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function apiClient(email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password: password as string })
  if (error) throw error
  return { client, userId: data.user.id }
}

async function insertMessage(api: { client: SupabaseClient; userId: string }, body: string) {
  const { error } = await api.client
    .from('AAA3_chat_messages')
    .insert({ room_id: roomId, sender_id: api.userId, body })
  if (error) throw error
}

async function dbBodies(client: SupabaseClient, runId: string): Promise<string[]> {
  const { data, error } = await client
    .from('AAA3_chat_messages')
    .select('body')
    .eq('room_id', roomId as string)
    .like('body', `${runId} %`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map((row) => row.body as string)
}

async function pageBodies(page: Page, runId: string): Promise<string[]> {
  const texts = await page.locator('.message-list .msg').allInnerTexts()
  const pattern = new RegExp(`${runId} \\d{3}`)
  return texts.map((text) => pattern.exec(text)?.[0]).filter((body): body is string => Boolean(body))
}

async function openRoom(browser: Browser, email: string, setup?: (context: BrowserContext) => Promise<void>) {
  const context = await browser.newContext()
  if (setup) await setup(context)
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
  await page.goto(`/rooms/${roomId}`)
  await expect(page.getByLabel('Messaggio')).toBeVisible()
  return { context, page }
}

test('un messaggio inviato mentre il canale realtime si sta ancora collegando non va perso', async ({
  browser,
}) => {
  const runId = newRunId()
  const sender = await apiClient(emails[1] as string)

  // Il websocket realtime resta scollegato dal server finché non lo
  // rilasciamo: simula la finestra tra il caricamento iniziale e l'effettiva
  // iscrizione al canale (stessa situazione di una riconnessione).
  let release!: () => void
  const released = new Promise<void>((resolve) => (release = resolve))
  const { context, page } = await openRoom(browser, emails[0] as string, (ctx) =>
    ctx.routeWebSocket(/\/realtime\/v1\/websocket/, async (ws) => {
      await released
      ws.connectToServer()
    }),
  )

  await page.waitForTimeout(1_000)
  await insertMessage(sender, `${runId} 001`)
  await page.waitForTimeout(1_500)
  expect(await pageBodies(page, runId), 'il realtime doveva essere bloccato').toEqual([])

  release()
  // Un secondo messaggio a canale ricollegato: quando arriva, il realtime
  // funziona di sicuro — a quel punto anche il primo deve esserci.
  await page.waitForTimeout(3_000)
  await insertMessage(sender, `${runId} 002`)
  await expect
    .poll(() => pageBodies(page, runId), { timeout: 30_000 })
    .toEqual(expect.arrayContaining([`${runId} 002`]))
  expect(await pageBodies(page, runId)).toEqual([`${runId} 001`, `${runId} 002`])

  await context.close()
})

test('tre persone che scrivono insieme vedono gli stessi messaggi, tutti e nello stesso ordine', async ({
  browser,
}) => {
  const runId = newRunId()
  const sessions = await Promise.all(emails.map((email) => openRoom(browser, email as string)))
  const pages = sessions.map((session) => session.page)
  const extra = await apiClient(emails[1] as string)

  // Aspetta che il realtime sia attivo su tutte e tre le pagine.
  await insertMessage(extra, `${runId} 000`)
  for (const page of pages) {
    await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual([`${runId} 000`])
  }

  const perPage = 8
  const sendFromUi = async (page: Page, index: number) => {
    for (let n = 1; n <= perPage; n++) {
      const seq = String(index * 100 + n).padStart(3, '0')
      const input = page.getByLabel('Messaggio')
      await input.fill(`${runId} ${seq}`)
      await page.getByRole('button', { name: 'Invia' }).click()
      // Il campo si svuota a invio confermato: scrivere prima perderebbe
      // il testo nuovo (lo cancella l'onSuccess del messaggio precedente).
      await expect(input).toHaveValue('', { timeout: 15_000 })
    }
  }
  // In parallelo: l'interfaccia delle tre persone più una raffica via API.
  await Promise.all([
    ...pages.map((page, index) => sendFromUi(page, index + 1)),
    Promise.all(Array.from({ length: 10 }, (_, n) => insertMessage(extra, `${runId} ${String(900 + n)}`))),
  ])

  const expectedCount = 1 + perPage * pages.length + 10
  await expect.poll(async () => (await dbBodies(extra.client, runId)).length, { timeout: 30_000 }).toBe(
    expectedCount,
  )
  const expected = await dbBodies(extra.client, runId)
  for (const page of pages) {
    await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
  }

  // Dopo un ricaricamento la lista deve restare identica (ordine dal server).
  await pages[0].reload()
  await expect.poll(() => pageBodies(pages[0], runId), { timeout: 30_000 }).toEqual(expected)

  await Promise.all(sessions.map((session) => session.context.close()))
})
