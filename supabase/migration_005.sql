-- ════════════════════════════════════════════════════════════════════════
-- EVO — migrazione 005
-- ────────────────────────────────────────────────────────────────────────
-- pg_cron schedule: chiama l'Edge Function `notification-tick` ogni minuto.
--
-- PREREQUISITO: prima di runnare questo file, devi aver deployato la
-- Edge Function `notification-tick` E aver impostato le sue env vars
-- (VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT).
--
-- ATTENZIONE: questo script contiene IL TUO PROJECT URL e ANON KEY.
-- Non c'è nulla di sensibile (sono già pubblici nel frontend), ma se mai
-- cambi progetto Supabase devi rieseguire questo file.
-- ════════════════════════════════════════════════════════════════════════

-- Estensioni necessarie
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Rimuove job precedente (idempotente)
do $$
begin
  perform cron.unschedule('evo-notification-tick');
exception when others then null;
end$$;

-- Schedule: ogni minuto, chiama l'Edge Function
select cron.schedule(
  'evo-notification-tick',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://vdgbzebtrbpjcxfekpkb.supabase.co/functions/v1/notification-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_dCtYyV6xkfd4fcu_nyy0hg_aWROkwwR'
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- Test manuale: chiama una volta sola
-- (commenta/decommenta se vuoi testare subito)
-- select net.http_post(
--   url := 'https://vdgbzebtrbpjcxfekpkb.supabase.co/functions/v1/notification-tick',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer sb_publishable_dCtYyV6xkfd4fcu_nyy0hg_aWROkwwR'
--   ),
--   body := '{}'::jsonb
-- );
