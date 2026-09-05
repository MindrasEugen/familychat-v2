-- ============================================================
-- familychat-v2 — schema iniziale
-- Profili, camere (rooms), membership/ruoli, inviti, messaggi di
-- camera, memoria delle traduzioni. Vedi PROMPT_REACT_REWRITE.md
-- per le decisioni complete; questo file implementa la sezione
-- "Modello di camere, identità e permessi" e "Memoria delle
-- traduzioni".
--
-- IMPORTANTE — convivenza con la v1: questo schema gira nello STESSO
-- progetto Supabase già usato dalla v1 (vedi FamilyChat/DB.sql), che
-- resta in produzione. Le tabelle nuove usano il prefisso "AAA3_" (su
-- richiesta esplicita), che le tiene comunque distinte da "messages"/
-- "push_subscriptions"/"todos" della v1 senza bisogno di verificarlo
-- caso per caso. Il bucket storage è "room-photos" (non "chat-photos"
-- della v1): path e policy diversi (qui la cartella di primo livello
-- è il room_id, non lo user_id). Nessuna tabella/policy/bucket della
-- v1 viene toccata da questo file.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- AAA3_profiles — un profilo per persona (username + foto profilo),
-- non più identificazione per nome-device su account condiviso
-- (lezione 1 del documento di decisioni).
-- ---------------------------------------------------------
create table if not exists public."AAA3_profiles" (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public."AAA3_profiles" enable row level security;

create policy "profiles_select_all"
on public."AAA3_profiles"
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public."AAA3_profiles"
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public."AAA3_profiles"
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- ---------------------------------------------------------
-- AAA3_rooms — camere create da chiunque; l'accesso è per invito
-- (vedi AAA3_room_invites), non per credenziali condivise.
-- ---------------------------------------------------------
create table if not exists public."AAA3_rooms" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- "on delete restrict": se un fondatore elimina il proprio account,
  -- l'eliminazione fallisce finché la camera non viene esplicitamente
  -- eliminata o l'ownership trasferita — evita di orfanare in silenzio
  -- una camera. Il documento di decisioni lascia questo caso "da
  -- chiarire in fase di implementazione": questa è la scelta interinale
  -- più prudente (blocca invece di cancellare/orfanare a sorpresa).
  founder_id uuid not null references public."AAA3_profiles" (id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public."AAA3_rooms" enable row level security;

-- ---------------------------------------------------------
-- AAA3_room_members — chi appartiene a quale camera, con quale ruolo.
-- Nessuna policy INSERT diretta: l'iscrizione avviene solo tramite
-- create_room (fondatore) o accept_room_invite (membro), mai da un
-- insert libero del client — altrimenti basterebbe conoscere un
-- room_id per auto-iscriversi senza invito.
-- ---------------------------------------------------------
create table if not exists public."AAA3_room_members" (
  room_id uuid not null references public."AAA3_rooms" (id) on delete cascade,
  user_id uuid not null references public."AAA3_profiles" (id) on delete cascade,
  role text not null check (role in ('founder', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public."AAA3_room_members" enable row level security;

create index if not exists "AAA3_room_members_user_id_idx" on public."AAA3_room_members" (user_id);

create policy "room_members_select_if_member"
on public."AAA3_room_members"
for select
to authenticated
using (
  exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_room_members".room_id
      and rm.user_id = (select auth.uid())
  )
);

-- Un membro può lasciare la camera (cancellare la propria riga);
-- il fondatore può rimuovere qualunque membro (gestione membri).
create policy "room_members_delete_self_or_founder"
on public."AAA3_room_members"
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public."AAA3_rooms" r
    where r.id = "AAA3_room_members".room_id
      and r.founder_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------
-- AAA3_rooms — policy (dopo room_members, da cui dipendono)
-- ---------------------------------------------------------
create policy "rooms_select_if_member"
on public."AAA3_rooms"
for select
to authenticated
using (
  exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_rooms".id
      and rm.user_id = (select auth.uid())
  )
);

create policy "rooms_insert_as_founder"
on public."AAA3_rooms"
for insert
to authenticated
with check (founder_id = (select auth.uid()));

create policy "rooms_update_founder_only"
on public."AAA3_rooms"
for update
to authenticated
using (founder_id = (select auth.uid()))
with check (founder_id = (select auth.uid()));

create policy "rooms_delete_founder_only"
on public."AAA3_rooms"
for delete
to authenticated
using (founder_id = (select auth.uid()));

-- Crea una camera e iscrive chi la crea come fondatore, in una singola
-- transazione atomica (evita una camera senza alcun membro se il secondo
-- insert fallisse). security definer: bypassa la regola "niente insert
-- diretto su AAA3_room_members", ma solo per iscrivere auth.uid() stesso.
create or replace function public.create_room(room_name text)
returns public."AAA3_rooms"
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room public."AAA3_rooms";
begin
  insert into public."AAA3_rooms" (name, founder_id)
  values (room_name, auth.uid())
  returning * into new_room;

  insert into public."AAA3_room_members" (room_id, user_id, role)
  values (new_room.id, auth.uid(), 'founder');

  return new_room;
end;
$$;

revoke all on function public.create_room(text) from public;
grant execute on function public.create_room(text) to authenticated;

-- ---------------------------------------------------------
-- AAA3_room_invites — inviti a codice (non email/password condivise).
-- Aperto/da chiarire per ora (vedi documento di decisioni):
-- limite di inviti per membro non ancora imposto qui.
-- ---------------------------------------------------------
create table if not exists public."AAA3_room_invites" (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public."AAA3_rooms" (id) on delete cascade,
  created_by uuid not null references public."AAA3_profiles" (id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(6), 'hex'),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public."AAA3_room_invites" enable row level security;

create index if not exists "AAA3_room_invites_room_id_idx" on public."AAA3_room_invites" (room_id);

create policy "room_invites_select_if_member"
on public."AAA3_room_invites"
for select
to authenticated
using (
  exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_room_invites".room_id
      and rm.user_id = (select auth.uid())
  )
);

create policy "room_invites_insert_if_member"
on public."AAA3_room_invites"
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_room_invites".room_id
      and rm.user_id = (select auth.uid())
  )
);

-- Nessuna policy UPDATE diretta: la revoca passa da revoke_room_invite,
-- così le uniche colonne modificabili dal client sono quelle che la
-- funzione permette (qui: solo revoked_at), non un UPDATE libero.

-- Chi ha creato l'invito può revocarlo prima che venga accettato; il
-- fondatore della camera può revocare qualunque invito della propria
-- camera (risponde alla domanda aperta del documento di decisioni:
-- sì, un membro può revocare un proprio invito non ancora accettato).
create or replace function public.revoke_room_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_created_by uuid;
begin
  select room_id, created_by into v_room_id, v_created_by
  from public."AAA3_room_invites"
  where id = invite_id;

  if v_room_id is null then
    raise exception 'invito non trovato';
  end if;

  if v_created_by <> auth.uid() and not exists (
    select 1 from public."AAA3_rooms" r
    where r.id = v_room_id and r.founder_id = auth.uid()
  ) then
    raise exception 'non autorizzato a revocare questo invito';
  end if;

  update public."AAA3_room_invites"
  set revoked_at = now()
  where id = invite_id and revoked_at is null;
end;
$$;

revoke all on function public.revoke_room_invite(uuid) from public;
grant execute on function public.revoke_room_invite(uuid) to authenticated;

-- Accetta un invito per codice: chi chiama non è ancora membro della
-- camera, quindi non potrebbe leggere la riga in AAA3_room_invites via
-- RLS — da qui la necessità di una funzione security definer invece di
-- un semplice select+insert lato client.
create or replace function public.accept_room_invite(invite_code text)
returns public."AAA3_rooms"
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public."AAA3_room_invites";
  v_room public."AAA3_rooms";
begin
  select * into v_invite
  from public."AAA3_room_invites"
  where code = invite_code
  for update;

  if v_invite.id is null then
    raise exception 'codice invito non valido';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invito revocato';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invito scaduto';
  end if;

  if v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses then
    raise exception 'invito già utilizzato';
  end if;

  insert into public."AAA3_room_members" (room_id, user_id, role)
  values (v_invite.room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do nothing;

  update public."AAA3_room_invites"
  set uses_count = uses_count + 1
  where id = v_invite.id;

  select * into v_room from public."AAA3_rooms" where id = v_invite.room_id;
  return v_room;
end;
$$;

revoke all on function public.accept_room_invite(text) from public;
grant execute on function public.accept_room_invite(text) to authenticated;

-- ---------------------------------------------------------
-- AAA3_chat_messages — messaggi di camera (testo e/o foto).
-- Nome distinto da "messages" (v1), oltre al prefisso comune "AAA3_",
-- per evitare qualunque ambiguità nello stesso schema public dello
-- stesso progetto Supabase.
-- ---------------------------------------------------------
create table if not exists public."AAA3_chat_messages" (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public."AAA3_rooms" (id) on delete cascade,
  sender_id uuid not null references public."AAA3_profiles" (id) on delete cascade,
  body text,
  image_path text,
  created_at timestamptz not null default now(),
  constraint "AAA3_chat_messages_body_or_image_present" check (body is not null or image_path is not null)
);

alter table public."AAA3_chat_messages" enable row level security;

-- Necessario perché gli eventi realtime di DELETE includano tutte le
-- colonne della riga eliminata (di default solo la primary key): serve
-- per poter verificare room_id lato client sull'evento di delete.
alter table public."AAA3_chat_messages" replica identity full;

create index if not exists "AAA3_chat_messages_room_id_created_at_idx" on public."AAA3_chat_messages" (room_id, created_at);

create policy "chat_messages_select_if_member"
on public."AAA3_chat_messages"
for select
to authenticated
using (
  exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_chat_messages".room_id
      and rm.user_id = (select auth.uid())
  )
);

create policy "chat_messages_insert_if_member"
on public."AAA3_chat_messages"
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_chat_messages".room_id
      and rm.user_id = (select auth.uid())
  )
);

-- Un membro cancella solo i propri messaggi; il fondatore cancella i
-- messaggi di chiunque nella propria camera (ruoli minimi, vedi
-- "Modello di camere, identità e permessi").
create policy "chat_messages_delete_own_or_founder"
on public."AAA3_chat_messages"
for delete
to authenticated
using (
  sender_id = (select auth.uid())
  or exists (
    select 1 from public."AAA3_rooms" r
    where r.id = "AAA3_chat_messages".room_id
      and r.founder_id = (select auth.uid())
  )
);

alter publication supabase_realtime add table public."AAA3_chat_messages";

-- ---------------------------------------------------------
-- Retention automatica: elimina i messaggi (testo) più vecchi di
-- 30 giorni, come in v1. Richiede l'estensione pg_cron — se il
-- comando sotto fallisce per permessi, abilita "pg_cron" da
-- Dashboard → Database → Extensions e poi ri-esegui solo questa
-- sezione.
--
-- NOTA — gap noto (da chiudere insieme alla feature foto/upload):
-- questo job cancella solo le righe di AAA3_chat_messages. I file
-- corrispondenti nel bucket storage "room-photos" NON vengono
-- rimossi da questo job (a differenza di una riga in una tabella,
-- un file storage richiede l'API di Storage, non una semplice DELETE
-- SQL, per essere rimosso in modo affidabile) — vedi PLAN.md.
-- ---------------------------------------------------------
create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'AAA3_chat_messages_retention_30d';

select cron.schedule(
  'AAA3_chat_messages_retention_30d',
  '0 3 * * *',
  $$delete from public."AAA3_chat_messages" where created_at < now() - interval '30 days'$$
);

-- ---------------------------------------------------------
-- Storage — bucket foto di camera
-- Bucket privato, distinto da "chat-photos" (v1). Convenzione path:
-- "<room_id>/<nome-file>" — le policy verificano l'appartenenza alla
-- camera (le foto sono condivise tra i membri, non private per persona).
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', false)
on conflict (id) do nothing;

create policy "room_photos_select_if_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'room-photos'
  and exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = (storage.foldername(name))[1]::uuid
      and rm.user_id = (select auth.uid())
  )
);

create policy "room_photos_insert_if_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-photos'
  and exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = (storage.foldername(name))[1]::uuid
      and rm.user_id = (select auth.uid())
  )
);

-- Un membro cancella solo le proprie foto (owner, impostato in automatico
-- da Supabase Storage all'upload); il fondatore cancella qualunque foto
-- della propria camera — stessa semantica di chat_messages_delete_own_or_founder.
create policy "room_photos_delete_own_or_founder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'room-photos'
  and (
    owner = (select auth.uid())
    or exists (
      select 1 from public."AAA3_rooms" r
      where r.id = (storage.foldername(name))[1]::uuid
        and r.founder_id = (select auth.uid())
    )
  )
);

-- ---------------------------------------------------------
-- AAA3_translation_memory — dizionario correggibile, condiviso tra
-- tutta la famiglia (non locale a un dispositivo). Vedi "Memoria delle
-- traduzioni" nel documento di decisioni.
-- ---------------------------------------------------------
create table if not exists public."AAA3_translation_memory" (
  id uuid primary key default gen_random_uuid(),
  source_text text not null,
  -- Normalizzazione per il confronto "stesso testo": case e spazi
  -- iniziali/finali, MAI fuzzy — un match parziale rischierebbe di
  -- applicare una correzione al testo sbagliato.
  source_text_normalized text generated always as (lower(btrim(source_text))) stored,
  source_lang text not null,
  target_lang text not null,
  translated_text text not null,
  provider text not null,
  corrected_by_user boolean not null default false,
  corrected_by uuid references public."AAA3_profiles" (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lezione 4: non salvare mai una traduzione tornata identica
  -- all'originale quando le lingue sorgente/destinazione sono diverse
  -- — è quasi sempre un fallimento silenzioso del servizio. L'Edge
  -- Function che scrive qui deve trattare la violazione di questo
  -- vincolo (23514) come "non mettere in cache", non come un errore
  -- da propagare all'utente.
  constraint "AAA3_translation_memory_no_silent_noop" check (
    source_lang = target_lang or lower(btrim(translated_text)) <> source_text_normalized
  ),
  constraint "AAA3_translation_memory_unique_lookup" unique (source_text_normalized, source_lang, target_lang)
);

alter table public."AAA3_translation_memory" enable row level security;

create policy "translation_memory_select_all"
on public."AAA3_translation_memory"
for select
to authenticated
using (true);

create policy "translation_memory_insert_all"
on public."AAA3_translation_memory"
for insert
to authenticated
with check (true);

create policy "translation_memory_update_all"
on public."AAA3_translation_memory"
for update
to authenticated
using (true)
with check (true);

-- Le entry corrette manualmente (corrected_by_user = true) non vengono
-- mai sovrascritte da un aggiornamento che non sia esso stesso una
-- correzione: se un upsert "di cache" prova a toccare una riga già
-- corretta, la riga resta invariata (return old), invece di essere
-- silenziosamente rimpiazzata dalla prossima chiamata API.
create or replace function public.protect_corrected_translation()
returns trigger
language plpgsql
as $$
begin
  if old.corrected_by_user and not new.corrected_by_user then
    return old;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_corrected_translation_trigger
before update on public."AAA3_translation_memory"
for each row
execute function public.protect_corrected_translation();
