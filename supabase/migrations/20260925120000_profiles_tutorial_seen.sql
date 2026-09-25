-- Tutorial di benvenuto: mostrato una sola volta per persona (non per
-- dispositivo), subito dopo la creazione del profilo. NULL = da mostrare.
--
-- Decisione dell'utente (2026-09-25): solo i nuovi iscritti lo vedono, quindi
-- i profili già esistenti vengono segnati come "già visto" qui sotto. La
-- colonna resta aggiornabile solo dal proprietario tramite la policy
-- "profiles_update_own" già esistente.
alter table public."AAA3_profiles"
  add column if not exists tutorial_seen_at timestamptz;

update public."AAA3_profiles"
set tutorial_seen_at = now()
where tutorial_seen_at is null;
