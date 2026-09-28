-- Permessi di tabella dichiarati esplicitamente, uguali a quelli del
-- progetto online. Online arrivano dalle default privileges che Supabase
-- impostava alla creazione del progetto (grant all ad anon, authenticated e
-- service_role su ogni nuova tabella di public); le versioni recenti non le
-- impostano più, e un database ricreato dalle sole migrazioni (supabase
-- start / db reset in locale) avrebbe tabelle senza select/insert/update/
-- delete per i ruoli dell'app. Chi vede cosa resta deciso dalla RLS, attiva
-- su tutte le tabelle AAA3_.
-- Online non cambia nulla: questi permessi ci sono già.

grant all on table
  public."AAA3_chat_messages",
  public."AAA3_profiles",
  public."AAA3_push_subscriptions",
  public."AAA3_room_invites",
  public."AAA3_room_members",
  public."AAA3_rooms",
  public."AAA3_translation_memory"
to anon, authenticated, service_role;

-- Il contatore della traduzione resta solo per service_role (vedi
-- 20260928120000_translation_usage.sql, che revoca anon/authenticated).
grant all on table public."AAA3_translation_usage" to service_role;
