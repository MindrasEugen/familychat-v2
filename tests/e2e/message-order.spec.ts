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

// "Carica messaggi precedenti" quando il bordo tra due pagine cade in mezzo
// a messaggi con lo stesso orario: 99 messaggi con orari diversi e, più
// vecchi di tutti, 3 con lo stesso orario. La prima pagina (100) ne prende
// uno solo; la successiva deve portare gli altri due, senza saltarne e senza
// doppioni. Camera creata apposta e poi eliminata.
test('pagina precedente con messaggi allo stesso orario sul bordo: nessuno saltato né doppio', async ({ page }) => {
  const runId = newRunId()
  const owner = await apiClient(env.E2E_EMAIL_A as string)
  const { data: room, error: roomError } = await owner.client.rpc('create_room', { room_name: `ordine ${runId}` })
  if (roomError) throw roomError

  try {
    const base = Date.now() - 60 * 60_000
    const tiedAt = new Date(base).toISOString()
    // Stesso orario, id in ordine crescente: 001, 002, 003.
    const tied = ['1', '5', '9'].map((first, index) => ({
      id: uuidStartingWith(first),
      created_at: tiedAt,
      body: `${runId} ${String(index + 1).padStart(3, '0')}`,
    }))
    const distinct = Array.from({ length: 99 }, (_, index) => ({
      id: crypto.randomUUID(),
      created_at: new Date(base + (index + 1) * 1000).toISOString(),
      body: `${runId} ${String(index + 4).padStart(3, '0')}`,
    }))
    const { error } = await owner.client
      .from('AAA3_chat_messages')
      .insert([...tied, ...distinct].map((row) => ({ ...row, room_id: room.id, sender_id: owner.userId })))
    if (error) throw error

    const expected = Array.from({ length: 102 }, (_, index) => `${runId} ${String(index + 1).padStart(3, '0')}`)
    expect(await dbBodies(owner.client, room.id, runId)).toEqual(expected)

    await openRoom(page, env.E2E_EMAIL_A as string, room.id)
    // Prima pagina: gli ultimi 100, cioè dal terzo dei messaggi con lo
    // stesso orario in poi.
    await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected.slice(2))

    await page.getByRole('button', { name: 'Carica messaggi precedenti' }).click()
    await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
    await expect(page.getByText('Inizio della cronologia.')).toBeVisible()
  } finally {
    await owner.client.from('AAA3_rooms').delete().eq('id', room.id)
  }
})

// Orari con un numero diverso di decimali, come li restituisce PostgREST
// (senza zeri finali): l'ordine nell'app, arrivati via realtime e dopo un
// ricaricamento, deve coincidere con quello del database. Gli id vanno in
// senso opposto al tempo, così un confronto sbagliato non passa per caso.
test('orari con decimali di lunghezza diversa: stesso ordine in app e nel database', async ({ page }) => {
  const runId = newRunId()
  const sender = await apiClient(env.E2E_EMAIL_B as string)
  await openRoom(page, env.E2E_EMAIL_A as string, roomId as string)

  const { error: probeError } = await sender.client
    .from('AAA3_chat_messages')
    .insert({ room_id: roomId, sender_id: sender.userId, body: `${runId} 000` })
  if (probeError) throw probeError
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual([`${runId} 000`])

  // Secondo intero nel futuro (così sono gli ultimi della camera).
  const second = new Date(Math.ceil((Date.now() + 120_000) / 1000) * 1000).toISOString().slice(0, 19)
  const rows = [
    ['', '001'],
    ['.000001', '002'],
    ['.479999', '003'],
    ['.48', '004'],
    ['.480001', '005'],
    ['.5', '006'],
  ].map(([fraction, seq], index, all) => ({
    // id decrescenti mentre il tempo cresce.
    id: uuidStartingWith('fedcba'[all.length - 1 - index]),
    created_at: `${second}${fraction}+00:00`,
    body: `${runId} ${seq}`,
  }))
  // Inseriti in ordine sparso.
  for (const row of [rows[3], rows[0], rows[5], rows[2], rows[4], rows[1]]) {
    const { error } = await sender.client
      .from('AAA3_chat_messages')
      .insert({ ...row, room_id: roomId, sender_id: sender.userId })
    if (error) throw error
  }

  const expected = [`${runId} 000`, ...rows.map((row) => row.body)]
  expect(await dbBodies(sender.client, roomId as string, runId)).toEqual(expected)
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
  await page.reload()
  await expect.poll(() => pageBodies(page, runId), { timeout: 30_000 }).toEqual(expected)
})
