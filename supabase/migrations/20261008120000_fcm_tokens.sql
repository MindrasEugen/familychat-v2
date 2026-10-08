-- ---------------------------------------------------------
-- AAA3_fcm_tokens — notifiche dell'app Android nativa (Capacitor +
-- Firebase Cloud Messaging), accanto alle sottoscrizioni Web Push di
-- AAA3_push_subscriptions, che restano per il browser.
--
-- Tabella separata e non colonne in più su AAA3_push_subscriptions: un
-- token FCM non ha endpoint né chiavi p256dh/auth, e send-push lo invia
-- con un'altra API. Stesse regole: una riga per (account, dispositivo),
-- così due account sullo stesso telefono possono attivarle entrambi e
-- "Disattiva" toglie solo la riga del proprio account; send-push deduplica
-- i token ed esclude quelli del mittente (lezione 8).
-- ---------------------------------------------------------
create table if not exists public."AAA3_fcm_tokens" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public."AAA3_profiles" (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  constraint "AAA3_fcm_tokens_user_token_key" unique (user_id, token)
);

alter table public."AAA3_fcm_tokens" enable row level security;

create index if not exists "AAA3_fcm_tokens_user_id_idx" on public."AAA3_fcm_tokens" (user_id);

-- Ognuno gestisce solo i propri token. send-push legge con la service role
-- (bypassa la RLS). Niente policy UPDATE: l'app fa insert (upsert senza
-- modifiche: ignoreDuplicates) e delete.
create policy "fcm_tokens_select_own"
on public."AAA3_fcm_tokens"
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "fcm_tokens_insert_own"
on public."AAA3_fcm_tokens"
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "fcm_tokens_delete_own"
on public."AAA3_fcm_tokens"
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Permessi espliciti come per le altre tabelle (vedi
-- 20260928130000_explicit_table_grants.sql); chi vede cosa lo decide la RLS.
grant all on table public."AAA3_fcm_tokens" to anon, authenticated, service_role;
