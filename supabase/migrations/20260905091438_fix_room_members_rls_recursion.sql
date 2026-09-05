-- ============================================================
-- Fix: ricorsione infinita nelle policy RLS su AAA3_room_members
-- (Postgres error 42P17)
--
-- Bug reale trovato testando /rooms in un browser reale: la policy
-- "room_members_select_if_member" faceva un EXISTS sulla STESSA tabella
-- AAA3_room_members che la RLS sta proteggendo. Valutare quella subquery
-- riattiva la policy stessa, che valuta di nuovo la subquery, all'infinito
-- — Postgres la rileva e restituisce un errore invece di un loop reale,
-- ma il risultato per il client è comunque un 500 su qualunque query che
-- passi da lì. E "qualunque query" è più ampio di quanto sembri: le
-- policy di AAA3_rooms, AAA3_room_invites, AAA3_chat_messages e del
-- bucket "room-photos" fanno tutte un EXISTS su AAA3_room_members per
-- verificare l'appartenenza alla camera, quindi ereditavano lo stesso
-- errore a catena.
--
-- Fix standard per questo caso (documentato anche da Supabase per
-- verifiche di membership ricorsive): spostare il controllo in una
-- funzione SECURITY DEFINER, che bypassa la RLS e quindi non
-- ri-attiva le policy che la usano.
-- ============================================================

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."AAA3_room_members"
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

create or replace function public.is_room_founder(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public."AAA3_rooms"
    where id = p_room_id and founder_id = auth.uid()
  );
$$;

revoke all on function public.is_room_founder(uuid) from public;
grant execute on function public.is_room_founder(uuid) to authenticated;

-- AAA3_room_members
drop policy if exists "room_members_select_if_member" on public."AAA3_room_members";
create policy "room_members_select_if_member"
on public."AAA3_room_members"
for select
to authenticated
using (public.is_room_member(room_id));

drop policy if exists "room_members_delete_self_or_founder" on public."AAA3_room_members";
create policy "room_members_delete_self_or_founder"
on public."AAA3_room_members"
for delete
to authenticated
using (user_id = (select auth.uid()) or public.is_room_founder(room_id));

-- AAA3_rooms
drop policy if exists "rooms_select_if_member" on public."AAA3_rooms";
create policy "rooms_select_if_member"
on public."AAA3_rooms"
for select
to authenticated
using (public.is_room_member(id));

-- AAA3_room_invites
drop policy if exists "room_invites_select_if_member" on public."AAA3_room_invites";
create policy "room_invites_select_if_member"
on public."AAA3_room_invites"
for select
to authenticated
using (public.is_room_member(room_id));

drop policy if exists "room_invites_insert_if_member" on public."AAA3_room_invites";
create policy "room_invites_insert_if_member"
on public."AAA3_room_invites"
for insert
to authenticated
with check (created_by = (select auth.uid()) and public.is_room_member(room_id));

-- AAA3_chat_messages
drop policy if exists "chat_messages_select_if_member" on public."AAA3_chat_messages";
create policy "chat_messages_select_if_member"
on public."AAA3_chat_messages"
for select
to authenticated
using (public.is_room_member(room_id));

drop policy if exists "chat_messages_insert_if_member" on public."AAA3_chat_messages";
create policy "chat_messages_insert_if_member"
on public."AAA3_chat_messages"
for insert
to authenticated
with check (sender_id = (select auth.uid()) and public.is_room_member(room_id));

drop policy if exists "chat_messages_delete_own_or_founder" on public."AAA3_chat_messages";
create policy "chat_messages_delete_own_or_founder"
on public."AAA3_chat_messages"
for delete
to authenticated
using (sender_id = (select auth.uid()) or public.is_room_founder(room_id));

-- storage.objects ("room-photos")
drop policy if exists "room_photos_select_if_member" on storage.objects;
create policy "room_photos_select_if_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'room-photos'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "room_photos_insert_if_member" on storage.objects;
create policy "room_photos_insert_if_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'room-photos'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "room_photos_delete_own_or_founder" on storage.objects;
create policy "room_photos_delete_own_or_founder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'room-photos'
  and (
    owner = (select auth.uid())
    or public.is_room_founder(((storage.foldername(name))[1])::uuid)
  )
);
