-- ---------------------------------------------------------
-- Traduzione automatica accendibile/spegnibile per camera (anche nelle
-- chat private), per ognuno e salvata sull'account (vale su tutti i suoi
-- dispositivi). Decisione dell'utente (2026-10-08): accesa di default,
-- come prima — dopo l'aggiornamento non cambia nulla finché qualcuno non
-- la spegne dall'info della camera.
--
-- Stesso schema di notifications_muted (20260925140000): nessuna policy
-- UPDATE su AAA3_room_members (permetterebbe di cambiare anche il ruolo),
-- la modifica passa da una funzione security definer che tocca solo questa
-- colonna e solo la riga di chi la chiama.
-- ---------------------------------------------------------
alter table public."AAA3_room_members"
  add column if not exists translation_enabled boolean not null default true;

create or replace function public.set_room_translation_enabled(p_room_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public."AAA3_room_members"
  set translation_enabled = p_enabled
  where room_id = p_room_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Non fai parte di questa camera.';
  end if;
end;
$$;

revoke all on function public.set_room_translation_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_room_translation_enabled(uuid, boolean) to authenticated;
