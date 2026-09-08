-- ---------------------------------------------------------
-- Pulizia file orfani in "room-photos" (chiude il gap noto lasciato in
-- 20260905083821_init_v2_schema.sql: il job di retention 30gg cancella le
-- righe di AAA3_chat_messages ma non i file storage corrispondenti).
--
-- Schedula una chiamata giornaliera alla Edge Function
-- "cleanup-orphan-photos" tramite pg_net (non supabase_functions.http_request:
-- quella è pensata per i trigger su riga, qui serve una chiamata schedulata
-- senza un evento di INSERT/UPDATE associato).
--
-- ATTENZIONE: questo repo è pubblico. Il placeholder qui sotto NON va MAI
-- sostituito con il valore reale in un file committato — applicare questa
-- migrazione con il valore vero solo tramite una copia locale/temporanea del
-- file, mai tracciata da git (stesso schema già usato per
-- 20260907203000_push_subscriptions.sql).
-- ---------------------------------------------------------
create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname = 'AAA3_cleanup_orphan_photos';

select cron.schedule(
  'AAA3_cleanup_orphan_photos',
  '30 3 * * *',
  $$
  select net.http_post(
    url := 'https://qamvkevkddfwyxhbftoy.supabase.co/functions/v1/cleanup-orphan-photos',
    headers := '{"Content-type":"application/json","x-webhook-secret":"__CLEANUP_WEBHOOK_SECRET__"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);
