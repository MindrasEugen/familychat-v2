-- Contatore mensile per servizio di traduzione, usato solo dalla Edge
-- Function translate-message (con service_role):
--   - chars: caratteri inviati a Google nel mese, per restare sotto la
--     soglia gratuita (oltre, Google non dà errore ma addebita);
--   - exhausted: Azure ha risposto 403 (quota F0 esaurita), non riprovarlo
--     fino al mese successivo.
-- Il mese è quello UTC (primo giorno del mese): una nuova riga per mese
-- azzera tutto da sola, senza job di pulizia.
-- Solo additiva: nuova tabella e nuove funzioni, niente di esistente toccato.

create table if not exists public."AAA3_translation_usage" (
  provider text not null,
  month date not null,
  chars bigint not null default 0 check (chars >= 0),
  exhausted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (provider, month)
);

-- RLS attiva e nessuna policy: dal client (anon/authenticated) non si
-- legge né si scrive nulla. service_role bypassa RLS. Il revoke esplicito
-- serve perché su Supabase le default privileges concedono comunque i
-- permessi di tabella ad anon/authenticated.
alter table public."AAA3_translation_usage" enable row level security;
revoke all on table public."AAA3_translation_usage" from public, anon, authenticated;

-- Incremento atomico: "insert ... on conflict do update" è una sola
-- istruzione, quindi due richieste simultanee non perdono caratteri (la
-- seconda aspetta il lock di riga della prima e somma sul valore aggiornato).
create or replace function public.increment_translation_usage(p_provider text, p_chars integer)
returns bigint
language sql
set search_path = ''
as $$
  insert into public."AAA3_translation_usage" (provider, month, chars)
  values (p_provider, date_trunc('month', now() at time zone 'utc')::date, greatest(p_chars, 0))
  on conflict (provider, month) do update
    set chars = public."AAA3_translation_usage".chars + excluded.chars,
        updated_at = now()
  returning chars;
$$;

create or replace function public.mark_translation_provider_exhausted(p_provider text)
returns void
language sql
set search_path = ''
as $$
  insert into public."AAA3_translation_usage" (provider, month, exhausted)
  values (p_provider, date_trunc('month', now() at time zone 'utc')::date, true)
  on conflict (provider, month) do update
    set exhausted = true,
        updated_at = now();
$$;

-- Eseguibili solo da service_role (stesso motivo del revoke sulla tabella:
-- le default privileges danno EXECUTE anche ad anon/authenticated).
revoke execute on function public.increment_translation_usage(text, integer) from public, anon, authenticated;
revoke execute on function public.mark_translation_provider_exhausted(text) from public, anon, authenticated;
grant execute on function public.increment_translation_usage(text, integer) to service_role;
grant execute on function public.mark_translation_provider_exhausted(text) to service_role;
