-- Chiude l'esecuzione delle funzioni security definer al ruolo anon.
-- Le migrazioni precedenti facevano "revoke all ... from public", ma su
-- Supabase le default privileges concedono EXECUTE direttamente ad anon
-- (non solo tramite public), quindi quel revoke non bastava: le funzioni
-- restavano chiamabili via /rest/v1/rpc/* senza login (advisor 0028).
-- mark_room_read e set_room_notifications_muted erano già a posto.
revoke execute on function public.accept_room_invite(text) from anon;
revoke execute on function public.create_room(text) from anon;
revoke execute on function public.revoke_room_invite(uuid) from anon;
revoke execute on function public.is_room_member(uuid) from anon;
revoke execute on function public.is_room_founder(uuid) from anon;

-- Unica funzione senza search_path fissato (advisor 0011).
alter function public.protect_corrected_translation() set search_path = public;
