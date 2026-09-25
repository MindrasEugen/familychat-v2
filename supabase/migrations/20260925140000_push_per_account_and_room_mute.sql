-- ---------------------------------------------------------
-- 1) Iscrizioni push per account + dispositivo, non solo per dispositivo.
--
-- Con il multi-account (fino a 2 account sullo stesso dispositivo) lo
-- stesso endpoint del browser deve poter appartenere a entrambi: con
-- UNIQUE(endpoint) il secondo account non poteva iscriversi (l'upsert
-- andava in conflitto con una riga di un altro utente, invisibile e non
-- aggiornabile per RLS). send-push deduplica gli endpoint, quindi un
-- messaggio per due account sullo stesso telefono produce una sola notifica.
-- ---------------------------------------------------------
alter table public."AAA3_push_subscriptions"
  drop constraint if exists "AAA3_push_subscriptions_endpoint_key";

alter table public."AAA3_push_subscriptions"
  add constraint "AAA3_push_subscriptions_user_endpoint_key" unique (user_id, endpoint);

-- ---------------------------------------------------------
-- 2) Notifiche per camera: un membro può silenziare una singola camera.
--
-- Niente policy UPDATE su AAA3_room_members (permetterebbe di cambiare
-- anche il ruolo): la modifica passa da una funzione security definer che
-- tocca solo questa colonna e solo la riga di chi la chiama.
-- ---------------------------------------------------------
alter table public."AAA3_room_members"
  add column if not exists notifications_muted boolean not null default false;

create or replace function public.set_room_notifications_muted(p_room_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public."AAA3_room_members"
  set notifications_muted = p_muted
  where room_id = p_room_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Non fai parte di questa camera.';
  end if;
end;
$$;

revoke all on function public.set_room_notifications_muted(uuid, boolean) from public, anon;
grant execute on function public.set_room_notifications_muted(uuid, boolean) to authenticated;
