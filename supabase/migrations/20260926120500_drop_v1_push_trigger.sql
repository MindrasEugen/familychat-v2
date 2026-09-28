-- Dismissione della v1 (chat-famiglia): il suo trigger su public.messages
-- chiamava ancora send-push, che oggi è la versione riscritta per lo schema
-- v2 — ogni messaggio v1 le avrebbe mandato un payload che non si aspetta.
-- Le tabelle/bucket della v1 (messages, push_subscriptions, todos,
-- chat-photos) restano per ora, da rimuovere in un secondo momento.
-- La tabella v1 esiste solo sul database online: in locale (schema creato
-- dalle sole migrazioni v2) il drop va saltato, altrimenti fallisce.
do $$
begin
  if to_regclass('public.messages') is not null then
    drop trigger if exists "send-push-on-message" on public.messages;
  end if;
end $$;
