-- ---------------------------------------------------------
-- AAA3_push_subscriptions — sottoscrizioni Web Push per dispositivo.
-- Riusa la stessa coppia di chiavi VAPID già configurata per v1 (secret
-- VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY sul progetto, invariati) — un
-- dispositivo può restare sottoscritto sia a v1 sia a v2 senza conflitti,
-- le sottoscrizioni sono per endpoint (URL univoco del browser), non per
-- account/tabella.
-- ---------------------------------------------------------
create table if not exists public."AAA3_push_subscriptions" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public."AAA3_profiles" (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public."AAA3_push_subscriptions" enable row level security;

create index if not exists "AAA3_push_subscriptions_user_id_idx" on public."AAA3_push_subscriptions" (user_id);

-- Un utente gestisce solo le proprie sottoscrizioni (il proprio dispositivo
-- si registra/cancella). La Edge Function send-push legge con
-- SUPABASE_SERVICE_ROLE_KEY (bypassa RLS), non serve una policy select
-- cross-utente qui.
create policy "push_subscriptions_select_own"
on public."AAA3_push_subscriptions"
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "push_subscriptions_insert_own"
on public."AAA3_push_subscriptions"
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "push_subscriptions_delete_own"
on public."AAA3_push_subscriptions"
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ---------------------------------------------------------
-- Webhook: ad ogni nuovo messaggio, chiama la Edge Function send-push
-- (stesso meccanismo già in uso da v1 sulla tabella "messages", stesso
-- PUSH_WEBHOOK_SECRET già configurato come secret della function — un
-- trigger Postgres non può leggere un secret Deno, il valore va per forza
-- incorporato in chiaro nella definizione del trigger, esattamente come nel
-- trigger già esistente per v1 — vedi `information_schema.triggers`).
--
-- ATTENZIONE: questo repo è pubblico. Il placeholder qui sotto NON va MAI
-- sostituito con il valore reale in un file committato — applicare questa
-- migrazione con il valore vero solo tramite una copia locale/temporanea
-- del file, mai tracciata da git (vedi note del giro 2026-09-07 in
-- PLAN.md per il comando esatto usato).
-- ---------------------------------------------------------
create trigger "send_push_on_new_chat_message"
after insert on public."AAA3_chat_messages"
for each row
execute function supabase_functions.http_request(
  'https://qamvkevkddfwyxhbftoy.supabase.co/functions/v1/send-push',
  'POST',
  '{"Content-type":"application/json","x-webhook-secret":"__PUSH_WEBHOOK_SECRET__"}',
  '{}',
  '5000'
);
