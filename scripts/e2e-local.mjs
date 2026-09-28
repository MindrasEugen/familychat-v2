// Test e2e (Playwright) sul Supabase LOCALE invece che sul progetto reale.
//   npx supabase start        (una volta, serve Docker Desktop acceso)
//   pnpm test:e2e:local       (argomenti extra passati a playwright, es. tests/e2e/tutorial.spec.ts)
//
// Crea (o riusa) tre account di prova @local.test e la camera "e2e-local",
// poi lancia i test con le variabili E2E_* e VITE_SUPABASE_* puntate sul
// locale: hanno la precedenza su .env.local, sia per Vite sia per i test.
// Le chiavi non stanno in nessun file: si leggono ogni volta da
// "supabase status" (sono quelle, pubbliche, dello stack locale).
import { execSync, spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const status = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split(/\r?\n/)
    .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line))
    .filter(Boolean)
    .map(([, key, value]) => [key, value]),
)

// Guardia: mai creare account o lanciare test contro un Supabase non locale.
const url = new URL(status.API_URL ?? '')
if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
  console.error(`Supabase non locale (${status.API_URL}): mi fermo.`)
  process.exit(1)
}

// Playwright riusa un server già acceso sulla 5173 (reuseExistingServer): se
// fosse un "pnpm dev" normale, l'app parlerebbe col progetto reale.
const devServerUp = await fetch('http://localhost:5173').then(
  () => true,
  () => false,
)
if (devServerUp) {
  console.error('Un server è già acceso su localhost:5173 (probabilmente "pnpm dev"): spegnilo e rilancia.')
  process.exit(1)
}

const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const password = 'e2e-local-password'
const users = []
for (const name of ['a', 'b', 'c']) {
  const email = `e2e-${name}@local.test`
  let { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) {
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list.users.find((user) => user.email === email)
    if (!existing) throw error
    data = { user: existing }
  }
  const { error: profileError } = await admin
    .from('AAA3_profiles')
    .upsert({ id: data.user.id, username: `e2e_${name}`, tutorial_seen_at: new Date().toISOString() })
  if (profileError) throw profileError
  users.push({ email, id: data.user.id })
}

let { data: room } = await admin.from('AAA3_rooms').select('id').eq('name', 'e2e-local').maybeSingle()
if (!room) {
  const { data, error } = await admin
    .from('AAA3_rooms')
    .insert({ name: 'e2e-local', founder_id: users[0].id })
    .select('id')
    .single()
  if (error) throw error
  room = data
}
const { error: membersError } = await admin.from('AAA3_room_members').upsert(
  users.map((user, index) => ({ room_id: room.id, user_id: user.id, role: index === 0 ? 'founder' : 'member' })),
)
if (membersError) throw membersError

const result = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: status.API_URL,
    VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    E2E_ROOM_ID: room.id,
    E2E_PASSWORD: password,
    E2E_EMAIL_A: users[0].email,
    E2E_EMAIL_B: users[1].email,
    E2E_EMAIL_C: users[2].email,
  },
})
process.exit(result.status ?? 1)
