-- ---------------------------------------------------------
-- Messaggi non letti nella lista camere.
--
-- "Letto" è per persona, non per dispositivo: last_read_at sul membro,
-- aggiornato quando la camera è aperta e visibile (mark_room_read). Per i
-- membri già esistenti vale now(): al rilascio nessuna camera risulta con
-- arretrati "finti" accumulati prima che la funzione esistesse.
-- ---------------------------------------------------------
alter table public."AAA3_room_members"
  add column if not exists last_read_at timestamptz not null default now();

-- Come set_room_notifications_muted: niente policy UPDATE sulla tabella
-- (permetterebbe di cambiare anche il ruolo), solo questa funzione che
-- tocca la propria riga e solo questa colonna.
create or replace function public.mark_room_read(p_room_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public."AAA3_room_members"
  set last_read_at = now()
  where room_id = p_room_id
    and user_id = auth.uid();
$$;

revoke all on function public.mark_room_read(uuid) from public, anon;
grant execute on function public.mark_room_read(uuid) to authenticated;

-- Lista camere con ultimo messaggio e numero di non letti, in una sola
-- richiesta. security invoker: le RLS esistenti su camere, membri e
-- messaggi valgono così come sono (si vedono solo le proprie camere).
-- I non letti escludono i propri messaggi.
create or replace function public.get_my_rooms()
returns table (
  id uuid,
  name text,
  founder_id uuid,
  created_at timestamptz,
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
    select m.created_at, m.body, m.image_paths, m.sender_id
    from public."AAA3_chat_messages" m
    where m.room_id = r.id
    order by m.created_at desc
    limit 1
  ) last_msg on true
  left join public."AAA3_profiles" sender on sender.id = last_msg.sender_id
  order by coalesce(last_msg.created_at, r.created_at) desc;
$$;

revoke all on function public.get_my_rooms() from public, anon;
grant execute on function public.get_my_rooms() to authenticated;
