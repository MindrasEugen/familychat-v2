-- =========================================================
-- Amici e chat private.
--
-- Decisioni prese con l'utente (2026-10-08):
-- - ogni account ha un codice amico personale; inserendo il codice di
--   qualcuno gli si manda una RICHIESTA, che diventa amicizia solo se
--   l'altro la accetta (un codice finito in mani sbagliate non basta);
-- - si può scrivere in privato agli amici E a chi è già in una camera con
--   te (in famiglia non serve scambiarsi il codice);
-- - togliendo un amico la chat privata resta leggibile ma non si può più
--   scrivere, finché non resta nessun legame (amicizia o camera in comune).
--
-- La chat privata è una camera con kind = 'direct' e due soli membri: così
-- messaggi, foto, traduzione, notifiche (Web Push e FCM), non letti e
-- camere silenziate valgono senza codice in più. Una sola camera per
-- coppia (direct_key). Nelle camere private nessuno è "fondatore": niente
-- inviti, rinomina, eliminazione, uscita o cancellazione dei messaggi
-- altrui.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Camere private
-- ---------------------------------------------------------
alter table public."AAA3_rooms"
  add column if not exists kind text not null default 'group',
  add column if not exists direct_key text;

alter table public."AAA3_rooms"
  add constraint "AAA3_rooms_kind_check" check (kind in ('group', 'direct')),
  add constraint "AAA3_rooms_direct_key_key" unique (direct_key),
  -- direct_key ("<uuid minore>:<uuid maggiore>") c'è se e solo se è privata.
  add constraint "AAA3_rooms_direct_key_iff_direct" check ((kind = 'direct') = (direct_key is not null));

-- Nelle camere private nessuno ha i poteri del fondatore. is_room_founder
-- è usata dalle policy di cancellazione di messaggi, membri e foto: un
-- solo punto copre tutti e tre i casi.
create or replace function public.is_room_founder(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."AAA3_rooms"
    where id = p_room_id and founder_id = auth.uid() and kind = 'group'
  );
$$;

-- Security definer come is_room_member: usata nelle policy di
-- AAA3_room_members senza ricadere nella RLS della stessa tabella.
create or replace function public.is_group_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public."AAA3_rooms" where id = p_room_id and kind = 'group');
$$;

revoke all on function public.is_group_room(uuid) from public, anon;
grant execute on function public.is_group_room(uuid) to authenticated;

-- Le camere private si creano solo da open_direct_chat (security definer).
drop policy if exists "rooms_insert_as_founder" on public."AAA3_rooms";
create policy "rooms_insert_as_founder"
on public."AAA3_rooms"
for insert
to authenticated
with check (founder_id = (select auth.uid()) and kind = 'group');

drop policy if exists "rooms_update_founder_only" on public."AAA3_rooms";
create policy "rooms_update_founder_only"
on public."AAA3_rooms"
for update
to authenticated
using (founder_id = (select auth.uid()) and kind = 'group')
with check (founder_id = (select auth.uid()) and kind = 'group');

drop policy if exists "rooms_delete_founder_only" on public."AAA3_rooms";
create policy "rooms_delete_founder_only"
on public."AAA3_rooms"
for delete
to authenticated
using (founder_id = (select auth.uid()) and kind = 'group');

-- Da una camera privata non si esce: la coppia resta, la chat diventa al
-- più di sola lettura.
drop policy if exists "room_members_delete_self_or_founder" on public."AAA3_room_members";
create policy "room_members_delete_self_or_founder"
on public."AAA3_room_members"
for delete
to authenticated
using (
  ((user_id = (select auth.uid())) or public.is_room_founder(room_id))
  and public.is_group_room(room_id)
);

-- Niente inviti nelle camere private (stessa policy di prima + kind).
drop policy if exists "room_invites_insert_if_member" on public."AAA3_room_invites";
create policy "room_invites_insert_if_member"
on public."AAA3_room_invites"
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_group_room(room_id)
  and exists (
    select 1 from public."AAA3_room_members" rm
    where rm.room_id = "AAA3_room_invites".room_id
      and rm.user_id = (select auth.uid())
  )
  and (
    exists (
      select 1 from public."AAA3_room_members" rm
      where rm.room_id = "AAA3_room_invites".room_id
        and rm.user_id = (select auth.uid())
        and rm.role = 'founder'
    )
    or (
      select count(*) from public."AAA3_room_invites" existing
      where existing.room_id = "AAA3_room_invites".room_id
        and existing.created_by = (select auth.uid())
        and existing.revoked_at is null
        and (existing.max_uses is null or existing.uses_count < existing.max_uses)
        and (existing.expires_at is null or existing.expires_at > now())
    ) < 5
  )
);

-- ---------------------------------------------------------
-- 2) Codice amico personale
--
-- Tabella a parte e non colonna di AAA3_profiles: i profili sono leggibili
-- da tutti gli utenti, il codice deve vederlo solo il proprietario.
-- 8 caratteri da un alfabeto di 31 senza simboli ambigui (niente 0/O,
-- 1/I/L): 31^8 ≈ 8,5·10^11 combinazioni. Salvato senza trattino, mostrato "ABCD-EFGH".
-- ---------------------------------------------------------
create table if not exists public."AAA3_friend_codes" (
  user_id uuid primary key references public."AAA3_profiles" (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public."AAA3_friend_codes" enable row level security;

create policy "friend_codes_select_own"
on public."AAA3_friend_codes"
for select
to authenticated
using (user_id = (select auth.uid()));

grant all on table public."AAA3_friend_codes" to anon, authenticated, service_role;

create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  -- pgcrypto sta nello schema "extensions" (anche online), fuori dal
  -- search_path della funzione.
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

revoke all on function public.generate_friend_code() from public, anon, authenticated;

-- Normalizza quello che l'utente scrive: maiuscole, solo lettere e cifre
-- ("abcd-efgh", "ABCD EFGH" → "ABCDEFGH").
create or replace function public.normalize_friend_code(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- Il proprio codice, creato al primo uso.
create or replace function public.get_my_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto.';
  end if;

  select code into v_code from public."AAA3_friend_codes" where user_id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;

  loop
    begin
      insert into public."AAA3_friend_codes" (user_id, code)
      values (auth.uid(), public.generate_friend_code())
      on conflict (user_id) do nothing
      returning code into v_code;
      if v_code is null then
        -- Creato in parallelo da un'altra richiesta dello stesso utente.
        select code into v_code from public."AAA3_friend_codes" where user_id = auth.uid();
      end if;
      return v_code;
    exception when unique_violation then
      -- Codice già usato da un altro account: se ne genera un altro.
    end;
  end loop;
end;
$$;

-- Nuovo codice: quello vecchio smette di funzionare (es. condiviso troppo).
-- Amicizie e richieste già fatte restano.
create or replace function public.regenerate_my_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto.';
  end if;

  perform public.get_my_friend_code();
  loop
    begin
      update public."AAA3_friend_codes"
      set code = public.generate_friend_code(), created_at = now()
      where user_id = auth.uid()
      returning code into v_code;
      return v_code;
    exception when unique_violation then
    end;
  end loop;
end;
$$;

revoke all on function public.get_my_friend_code() from public, anon;
grant execute on function public.get_my_friend_code() to authenticated;
revoke all on function public.regenerate_my_friend_code() from public, anon;
grant execute on function public.regenerate_my_friend_code() to authenticated;

-- ---------------------------------------------------------
-- 3) Amicizie e richieste
-- ---------------------------------------------------------
create table if not exists public."AAA3_friendships" (
  user_a uuid not null references public."AAA3_profiles" (id) on delete cascade,
  user_b uuid not null references public."AAA3_profiles" (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  -- Una riga per coppia, sempre nello stesso ordine.
  constraint "AAA3_friendships_ordered" check (user_a < user_b)
);

alter table public."AAA3_friendships" enable row level security;

create index if not exists "AAA3_friendships_user_b_idx" on public."AAA3_friendships" (user_b);

create policy "friendships_select_own"
on public."AAA3_friendships"
for select
to authenticated
using ((select auth.uid()) in (user_a, user_b));

-- Togliere un amico: ognuno dei due può farlo. Si crea solo accettando
-- una richiesta (funzioni sotto), niente policy INSERT.
create policy "friendships_delete_own"
on public."AAA3_friendships"
for delete
to authenticated
using ((select auth.uid()) in (user_a, user_b));

grant all on table public."AAA3_friendships" to anon, authenticated, service_role;

create table if not exists public."AAA3_friend_requests" (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public."AAA3_profiles" (id) on delete cascade,
  to_user uuid not null references public."AAA3_profiles" (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint "AAA3_friend_requests_pair_key" unique (from_user, to_user),
  constraint "AAA3_friend_requests_not_self" check (from_user <> to_user)
);

alter table public."AAA3_friend_requests" enable row level security;

create index if not exists "AAA3_friend_requests_to_user_idx" on public."AAA3_friend_requests" (to_user);

create policy "friend_requests_select_own"
on public."AAA3_friend_requests"
for select
to authenticated
using ((select auth.uid()) in (from_user, to_user));

-- Annullare (chi l'ha mandata) o rifiutare (chi l'ha ricevuta).
create policy "friend_requests_delete_own"
on public."AAA3_friend_requests"
for delete
to authenticated
using ((select auth.uid()) in (from_user, to_user));

grant all on table public."AAA3_friend_requests" to anon, authenticated, service_role;

create or replace function public.are_friends(p_user1 uuid, p_user2 uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."AAA3_friendships"
    where user_a = least(p_user1, p_user2) and user_b = greatest(p_user1, p_user2)
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- Insieme in almeno una camera di gruppo.
create or replace function public.shares_group_room(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."AAA3_room_members" mine
    join public."AAA3_room_members" theirs on theirs.room_id = mine.room_id
    join public."AAA3_rooms" r on r.id = mine.room_id and r.kind = 'group'
    where mine.user_id = auth.uid() and theirs.user_id = p_other
  );
$$;

revoke all on function public.shares_group_room(uuid) from public, anon;
grant execute on function public.shares_group_room(uuid) to authenticated;

-- Logica comune delle richieste (dal codice o dalla scheda di una persona).
-- Interna: la chiamano solo le due funzioni sotto, che decidono chi si può
-- cercare. Risultato:
--   'sent'            richiesta inviata
--   'accepted'        l'altro ti aveva già mandato una richiesta: ora siete amici
--   'already_friends' eravate già amici
--   'already_sent'    richiesta già inviata in precedenza
create or replace function public.request_friendship(p_other uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_inserted uuid;
begin
  if public.are_friends(v_me, p_other) then
    return 'already_friends';
  end if;

  -- Richiesta incrociata: l'altro ti aveva già cercato, quindi è d'accordo.
  if exists (select 1 from public."AAA3_friend_requests" where from_user = p_other and to_user = v_me) then
    insert into public."AAA3_friendships" (user_a, user_b)
    values (least(v_me, p_other), greatest(v_me, p_other))
    on conflict do nothing;
    delete from public."AAA3_friend_requests"
    where (from_user = v_me and to_user = p_other) or (from_user = p_other and to_user = v_me);
    return 'accepted';
  end if;

  -- Freno allo spam: chi prova codici a caso si ferma qui.
  if (select count(*) from public."AAA3_friend_requests" where from_user = v_me) >= 20 then
    raise exception 'Hai già 20 richieste in attesa: aspetta che vengano accettate o annullane qualcuna.';
  end if;

  insert into public."AAA3_friend_requests" (from_user, to_user)
  values (v_me, p_other)
  on conflict (from_user, to_user) do nothing
  returning id into v_inserted;

  return case when v_inserted is null then 'already_sent' else 'sent' end;
end;
$$;

revoke all on function public.request_friendship(uuid) from public, anon, authenticated;

-- Inserire il codice di qualcuno.
create or replace function public.send_friend_request(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_other uuid;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto.';
  end if;

  select user_id into v_other
  from public."AAA3_friend_codes"
  where code = public.normalize_friend_code(p_code);

  if v_other is null then
    raise exception 'Codice non valido: controlla di averlo scritto bene.';
  end if;
  if v_other = auth.uid() then
    raise exception 'Questo è il tuo codice: mandalo a chi vuoi aggiungere.';
  end if;

  return public.request_friendship(v_other);
end;
$$;

-- Dalla scheda di una persona in una camera: senza codice, ma solo verso
-- chi è in una camera di gruppo con te (gli altri id non li conosci, e
-- non si devono poter cercare persone a caso).
create or replace function public.send_friend_request_to_user(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto.';
  end if;
  if p_user is null or p_user = auth.uid() then
    raise exception 'Non puoi mandare una richiesta a te stesso.';
  end if;
  if not public.shares_group_room(p_user) then
    raise exception 'Puoi mandare una richiesta senza codice solo a chi è in una camera con te.';
  end if;

  return public.request_friendship(p_user);
end;
$$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid;
begin
  select from_user into v_from
  from public."AAA3_friend_requests"
  where id = p_request_id and to_user = auth.uid();

  if v_from is null then
    raise exception 'Richiesta non trovata (forse è stata annullata).';
  end if;

  insert into public."AAA3_friendships" (user_a, user_b)
  values (least(v_from, auth.uid()), greatest(v_from, auth.uid()))
  on conflict do nothing;

  delete from public."AAA3_friend_requests"
  where (from_user = v_from and to_user = auth.uid()) or (from_user = auth.uid() and to_user = v_from);
end;
$$;

revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.send_friend_request_to_user(uuid) from public, anon;
grant execute on function public.send_friend_request_to_user(uuid) to authenticated;
revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;

-- ---------------------------------------------------------
-- 4) Chi può scrivere in privato a chi
-- ---------------------------------------------------------

-- Amici, oppure insieme in almeno una camera di gruppo.
create or replace function public.can_chat_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_other <> auth.uid() and (public.are_friends(auth.uid(), p_other) or public.shares_group_room(p_other));
$$;

-- Si può scrivere in una camera: sempre in quelle di gruppo (se membri,
-- controllato a parte), in quelle private solo finché c'è un legame.
create or replace function public.can_send_in_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public."AAA3_rooms" where id = p_room_id and kind = 'direct') then true
    else coalesce((
      select public.can_chat_with(rm.user_id)
      from public."AAA3_room_members" rm
      where rm.room_id = p_room_id and rm.user_id <> auth.uid()
      limit 1
    ), false)
  end;
$$;

revoke all on function public.can_chat_with(uuid) from public, anon;
grant execute on function public.can_chat_with(uuid) to authenticated;
revoke all on function public.can_send_in_room(uuid) from public, anon;
grant execute on function public.can_send_in_room(uuid) to authenticated;

drop policy if exists "chat_messages_insert_if_member" on public."AAA3_chat_messages";
create policy "chat_messages_insert_if_member"
on public."AAA3_chat_messages"
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_room_member(room_id)
  and public.can_send_in_room(room_id)
);

-- Apre (o crea) la chat privata con un'altra persona e ne restituisce l'id.
-- Una chat già esistente si apre sempre, anche se ora è di sola lettura;
-- crearne una nuova richiede un legame.
create or replace function public.open_direct_chat(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_room_id uuid;
begin
  if v_me is null then
    raise exception 'Accesso richiesto.';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Non puoi aprire una chat privata con te stesso.';
  end if;

  v_key := least(v_me, p_other)::text || ':' || greatest(v_me, p_other)::text;

  select id into v_room_id from public."AAA3_rooms" where direct_key = v_key;
  if v_room_id is not null then
    return v_room_id;
  end if;

  if not public.can_chat_with(p_other) then
    raise exception 'Puoi scrivere in privato solo ai tuoi amici o a chi è in una camera con te.';
  end if;

  begin
    insert into public."AAA3_rooms" (name, founder_id, kind, direct_key)
    values ('', v_me, 'direct', v_key)
    returning id into v_room_id;
  exception when unique_violation then
    -- Aperta nello stesso momento dall'altra persona.
    select id into v_room_id from public."AAA3_rooms" where direct_key = v_key;
    return v_room_id;
  end;

  insert into public."AAA3_room_members" (room_id, user_id, role)
  values (v_room_id, v_me, 'member'), (v_room_id, p_other, 'member');

  return v_room_id;
end;
$$;

revoke all on function public.open_direct_chat(uuid) from public, anon;
grant execute on function public.open_direct_chat(uuid) to authenticated;

-- ---------------------------------------------------------
-- 5) Lista camere con le chat private
--
-- Stessa funzione di 20260925150000_rooms_unread.sql più il tipo di camera
-- e, per le private, l'altra persona (nome e foto da mostrare al posto del
-- nome della camera). Cambiano le colonne restituite: va ricreata.
-- ---------------------------------------------------------
drop function if exists public.get_my_rooms();

create function public.get_my_rooms()
returns table (
  id uuid,
  name text,
  founder_id uuid,
  created_at timestamptz,
  kind text,
  other_user_id uuid,
  other_username text,
  other_avatar_url text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_photo_count int,
  last_message_sender_id uuid,
  last_message_sender_name text,
  unread_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.founder_id,
    r.created_at,
    r.kind,
    other.id,
    other.username,
    other.avatar_url,
    last_msg.created_at,
    last_msg.body,
    coalesce(cardinality(last_msg.image_paths), 0),
    last_msg.sender_id,
    sender.username,
    (
      select count(*)::int
      from public."AAA3_chat_messages" m
      where m.room_id = r.id
        and m.created_at > rm.last_read_at
        and m.sender_id <> auth.uid()
    )
  from public."AAA3_rooms" r
  join public."AAA3_room_members" rm
    on rm.room_id = r.id and rm.user_id = auth.uid()
  left join lateral (
    select p.id, p.username, p.avatar_url
    from public."AAA3_room_members" om
    join public."AAA3_profiles" p on p.id = om.user_id
    where r.kind = 'direct' and om.room_id = r.id and om.user_id <> auth.uid()
    limit 1
  ) other on true
  left join lateral (
    select m.created_at, m.body, m.image_paths, m.sender_id
    from public."AAA3_chat_messages" m
    where m.room_id = r.id
    order by m.created_at desc
    limit 1
  ) last_msg on true
  left join public."AAA3_profiles" sender on sender.id = last_msg.sender_id
  -- Una chat privata appena aperta e ancora vuota non compare nella lista
  -- (come nelle app di messaggi): solo per chi l'ha aperta, finché non scrive.
  where r.kind = 'group' or last_msg.created_at is not null
  order by coalesce(last_msg.created_at, r.created_at) desc;
$$;

revoke all on function public.get_my_rooms() from public, anon;
grant execute on function public.get_my_rooms() to authenticated;
