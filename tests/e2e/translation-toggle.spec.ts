import { expect, test, type Browser } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Interruttore "Traduzione automatica" per camera (Info camera): spento,
// i messaggi restano come sono stati scritti, senza "Tradotto" né "Correggi".
// La traduzione si spegne PRIMA che arrivi il messaggio, così il testo non
// passa dai servizi di traduzione. SOLO sul Supabase locale
// (node scripts/e2e-local.mjs): cambia un'impostazione dell'account di prova.
const env = process.env
const password = env.E2E_PASSWORD
const [emailA, emailB] = [env.E2E_EMAIL_A, env.E2E_EMAIL_B]
const roomId = env.E2E_ROOM_ID
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.VITE_SUPABASE_URL ?? '')

test.skip(!isLocal || !password || !emailA || !emailB || !roomId, 'solo con node scripts/e2e-local.mjs')
test.describe.configure({ timeout: 120_000 })

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

test('traduzione spenta per una camera: testo originale, niente Tradotto/Correggi', async ({ browser }) => {
  const a = await signIn(browser, emailA as string)
  await a.page.goto(`/rooms/${roomId}/info`)
  const toggle = a.page.getByRole('switch', { name: 'Traduzione automatica di questa camera' })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(a.page.getByText('Spenta: vedi i messaggi come sono stati scritti.')).toBeVisible()

  // Resta spenta anche ricaricando (è salvata sull'account).
  await a.page.reload()
  await expect(a.page.getByRole('switch', { name: 'Traduzione automatica di questa camera' })).toHaveAttribute(
    'aria-checked',
    'false',
  )

  try {
    await a.page.goto(`/rooms/${roomId}`)
    // B scrive dal client Supabase e non dal browser: nel browser di B
    // (traduzione accesa) il suo messaggio passerebbe comunque dal traduttore.
    const b = createClient(env.VITE_SUPABASE_URL as string, env.VITE_SUPABASE_ANON_KEY as string, {
      auth: { persistSession: false },
    })
    const { data, error } = await b.auth.signInWithPassword({ email: emailB as string, password: password as string })
    if (error) throw error
    const text = `Ciao a tutti, oggi piove ${Date.now()}`
    const { error: insertError } = await b
      .from('AAA3_chat_messages')
      .insert({ room_id: roomId as string, sender_id: data.user.id, body: text })
    if (insertError) throw insertError

    const message = a.page.locator('.msg', { hasText: text })
    await expect(message).toBeVisible()
    await expect(message.getByText(text, { exact: true })).toBeVisible()
    await expect(message.getByText('Tradotto')).toHaveCount(0)
    await expect(message.getByRole('button', { name: /Correggi/ })).toHaveCount(0)
  } finally {
    // Riaccesa per gli altri test.
    await a.page.goto(`/rooms/${roomId}/info`)
    await a.page.getByRole('switch', { name: 'Traduzione automatica di questa camera' }).click()
    await expect(a.page.getByRole('switch', { name: 'Traduzione automatica di questa camera' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await a.context.close()
  }
})
