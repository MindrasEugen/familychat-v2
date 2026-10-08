import { expect, test, type Browser } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Amici e chat private, con due persone vere nel browser: A legge il suo
// codice, B lo inserisce, A accetta, A scrive in privato a B, B vede la chat
// in lista e risponde. Le regole fini (sola lettura, estranei, inviti...)
// sono provate in SQL; qui il percorso dell'interfaccia.
// SOLO sul Supabase locale (pnpm test:e2e:local): sul progetto reale
// lascerebbe amicizie tra gli account di prova.
const env = process.env
const password = env.E2E_PASSWORD
const [emailA, emailB] = [env.E2E_EMAIL_A, env.E2E_EMAIL_B]
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.VITE_SUPABASE_URL ?? '')

test.skip(!isLocal || !password || !emailA || !emailB, 'solo con pnpm test:e2e:local')
test.describe.configure({ timeout: 120_000 })

// Ripartenza pulita: niente amicizia né richieste tra A e B da giri
// precedenti (ognuno può cancellare le proprie, RLS).
async function resetFriendship() {
  const client = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email: emailA as string, password: password as string })
  if (error) throw error
  const me = data.user.id
  await client.from('AAA3_friend_requests').delete().or(`from_user.eq.${me},to_user.eq.${me}`)
  await client.from('AAA3_friendships').delete().or(`user_a.eq.${me},user_b.eq.${me}`)
}

async function signIn(browser: Browser, email: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL('**/rooms')
  return { context, page }
}

test('codice amico, richiesta accettata e chat privata', async ({ browser }) => {
  await resetFriendship()
  const a = await signIn(browser, emailA as string)
  const b = await signIn(browser, emailB as string)

  // A legge il suo codice nella pagina Amici.
  await a.page.getByRole('link', { name: 'Amici' }).click()
  const code = (await a.page.locator('.card code').first().textContent())?.trim() ?? ''
  expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)

  // B lo inserisce scritto male (minuscolo, senza trattino): vale lo stesso.
  await b.page.getByRole('link', { name: 'Amici' }).click()
  await b.page.getByLabel('Codice amico').fill(code.replace('-', '').toLowerCase())
  await b.page.getByRole('button', { name: 'Invia richiesta' }).click()
  await expect(b.page.getByRole('status')).toHaveText('Richiesta inviata: ora deve accettarla.')
  await expect(b.page.getByText('In attesa')).toBeVisible()

  // A vede la richiesta (pallino sulla scheda dopo il ricaricamento) e accetta.
  await a.page.reload()
  await expect(a.page.getByLabel('1 richieste di amicizia')).toBeVisible()
  await a.page.getByRole('button', { name: 'Accetta' }).click()
  const friendRow = a.page.locator('.member', { hasText: 'e2e_b' })
  await expect(friendRow.getByRole('button', { name: 'Scrivi' })).toBeVisible()
  await expect(a.page.getByRole('heading', { name: 'Amici' })).toBeVisible()

  // A scrive in privato a B. Sole cifre: senza lettere il testo non passa
  // dal traduttore (che lo cambierebbe nella lingua del browser).
  const text = String(Date.now())
  const reply = `${text}-2`
  await friendRow.getByRole('button', { name: 'Scrivi' }).click()
  await a.page.waitForURL('**/rooms/*')
  await expect(a.page.getByText('Chat privata')).toBeVisible()
  await expect(a.page.getByRole('heading', { name: 'e2e_b' })).toBeVisible()
  await a.page.getByLabel('Messaggio').fill(text)
  await a.page.getByRole('button', { name: 'Invia' }).click()
  await expect(a.page.getByText(text, { exact: true })).toBeVisible()

  // B la trova nella lista camere con il nome di A e l'anteprima.
  await b.page.getByRole('link', { name: 'Camere' }).click()
  const directRow = b.page.locator('.room-item', { hasText: 'e2e_a' })
  await expect(directRow).toContainText(text)
  await directRow.click()
  await expect(b.page.getByText(text, { exact: true })).toBeVisible()
  await b.page.getByLabel('Messaggio').fill(reply)
  await b.page.getByRole('button', { name: 'Invia' }).click()
  await expect(a.page.getByText(reply)).toBeVisible()

  // Info della chat privata: niente inviti né uscita, l'amicizia sì.
  await b.page.getByRole('link', { name: 'Info chat' }).click()
  await expect(b.page.getByRole('button', { name: 'Togli dagli amici' })).toBeVisible()
  await expect(b.page.getByRole('button', { name: 'Genera nuovo invito' })).toHaveCount(0)
  await expect(b.page.getByRole('button', { name: 'Esci dalla camera' })).toHaveCount(0)

  // Togliere l'amicizia: A e B sono anche nella camera di prova, quindi
  // possono ancora scriversi e la pagina lo spiega.
  await b.page.getByRole('button', { name: 'Togli dagli amici' }).click()
  // Prima la conferma: «Annulla» lascia tutto com'è.
  await b.page.getByRole('button', { name: 'Annulla' }).click()
  await expect(b.page.getByRole('button', { name: 'Togli dagli amici' })).toBeVisible()
  await b.page.getByRole('button', { name: 'Togli dagli amici' }).click()
  await b.page.getByRole('button', { name: 'Togli', exact: true }).click()
  await expect(b.page.getByText('siete in una camera insieme')).toBeVisible()

  await a.context.close()
  await b.context.close()
})

test('dal nome in una camera: scheda della persona e richiesta senza codice', async ({ browser }) => {
  const roomId = env.E2E_ROOM_ID
  test.skip(!roomId, 'E2E_ROOM_ID non impostato')
  await resetFriendship()

  // B scrive nella camera di gruppo (sole cifre: niente traduzione).
  const b = await signIn(browser, emailB as string)
  const text = String(Date.now())
  await b.page.goto(`/rooms/${roomId}`)
  await b.page.getByLabel('Messaggio').fill(text)
  await b.page.getByRole('button', { name: 'Invia' }).click()

  // A vede il separatore della data e tocca il nome di B sul messaggio.
  const a = await signIn(browser, emailA as string)
  await a.page.goto(`/rooms/${roomId}`)
  const message = a.page.locator('.msg', { hasText: text })
  await expect(message).toBeVisible()
  await expect(a.page.locator('.day-divider', { hasText: 'Oggi' })).toBeVisible()
  await message.getByRole('link', { name: 'e2e_b', exact: true }).click()

  await expect(a.page.getByRole('heading', { name: 'e2e_b' })).toBeVisible()
  await expect(a.page.getByText('Camere in comune')).toBeVisible()
  await a.page.getByRole('button', { name: 'Invia richiesta di amicizia' }).click()
  await expect(a.page.getByRole('status')).toHaveText('Richiesta inviata: ora deve accettarla.')
  await expect(a.page.getByText('Richiesta inviata, in attesa che la accetti.')).toBeVisible()

  // B la trova tra le richieste ricevute.
  await b.page.goto('/friends')
  await expect(b.page.locator('.member', { hasText: 'e2e_a' }).getByRole('button', { name: 'Accetta' })).toBeVisible()

  await a.context.close()
  await b.context.close()
})
