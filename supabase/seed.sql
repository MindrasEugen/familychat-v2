-- =====================================================================
-- SOLO LOCALE — NON ESEGUIRE MAI SUL PROGETTO ONLINE
-- (spegnerebbe le notifiche push e la pulizia notturna delle foto).
-- =====================================================================
-- Eseguito dalla CLI solo quando il database locale nasce da zero
-- (supabase start su volume vuoto, supabase db reset), dopo le migrazioni.
-- Mai usare "supabase db push --include-seed".
--
-- Il trigger delle notifiche e il job di pulizia foto puntano alle Edge
-- Function del progetto online (URL scritto nelle migrazioni). In locale
-- ogni messaggio dei test le chiamerebbe: vengono rifiutate (403, qui c'è
-- solo il segnaposto del segreto), ma non devono proprio partire.
-- Tolleranti: se trigger o job non esistono, non fanno nulla.
-- scripts/e2e-local.mjs controlla che siano davvero spenti prima dei test.

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgrelid = to_regclass('public."AAA3_chat_messages"')
      and tgname = 'send_push_on_new_chat_message'
  ) then
    alter table public."AAA3_chat_messages" disable trigger "send_push_on_new_chat_message";
  end if;

  if to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid) from cron.job where jobname = 'AAA3_cleanup_orphan_photos';
  end if;
end $$;
