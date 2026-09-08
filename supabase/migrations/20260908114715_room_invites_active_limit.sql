-- ---------------------------------------------------------
-- Limite di inviti attivi per membro/camera (punto lasciato esplicitamente
-- aperto in PROMPT_REACT_REWRITE.md: "se esiste un limite al numero di
-- persone che un membro può invitare" — non specificato lì, decisione
-- presa qui su indicazione esplicita dell'utente).
--
-- Scelta: 5 inviti ATTIVI (non revocati, non ancora usati, non scaduti)
-- per un MEMBRO in una camera — non un limite lifetime, un invito revocato
-- o già accettato libera immediatamente spazio per crearne un altro. Il
-- FONDATORE della camera non ha alcun limite (stesso principio di
-- "controllo pieno" già applicato a cancellazione messaggi/gestione
-- membri, vedi PROMPT_REACT_REWRITE.md).
--
-- Implementato estendendo la policy INSERT già esistente (stesso stile
-- degli altri controlli di appartenenza in questo schema), non con un
-- CHECK constraint: un CHECK non può contare le altre righe della stessa
-- tabella né leggere il ruolo da un'altra tabella.
-- ---------------------------------------------------------
drop policy if exists "room_invites_insert_if_member" on public."AAA3_room_invites";

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
  and (
    -- Il fondatore non è soggetto al limite.
    exists (
      select 1 from public."AAA3_room_members" rm
      where rm.room_id = "AAA3_room_invites".room_id
        and rm.user_id = (select auth.uid())
        and rm.role = 'founder'
    )
    or (
      select count(*)
      from public."AAA3_room_invites" existing
      where existing.room_id = "AAA3_room_invites".room_id
        and existing.created_by = (select auth.uid())
        and existing.revoked_at is null
        and (existing.max_uses is null or existing.uses_count < existing.max_uses)
        and (existing.expires_at is null or existing.expires_at > now())
    ) < 5
  )
);
