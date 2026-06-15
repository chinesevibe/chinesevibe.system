-- Phase 3 cron: weekly-summary, monthly-summary, announcement-scheduler
-- ICT = UTC+7 → 08:00 ICT = 01:00 UTC
-- Rollback:
--   select cron.unschedule('weekly-summary');
--   select cron.unschedule('monthly-summary');
--   select cron.unschedule('announcement-scheduler');

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'phase3 cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  -- weekly-summary: Monday 08:00 ICT (01:00 UTC)
  perform cron.unschedule('weekly-summary')
    where exists (select 1 from cron.job where jobname = 'weekly-summary');
  perform cron.schedule(
    'weekly-summary',
    '0 1 * * 1',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/weekly-summary',
      v_key
    )
  );

  -- monthly-summary: 1st of month 08:00 ICT (01:00 UTC on day 1)
  perform cron.unschedule('monthly-summary')
    where exists (select 1 from cron.job where jobname = 'monthly-summary');
  perform cron.schedule(
    'monthly-summary',
    '0 1 1 * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/monthly-summary',
      v_key
    )
  );

  -- announcement-scheduler: every 10 minutes
  perform cron.unschedule('announcement-scheduler')
    where exists (select 1 from cron.job where jobname = 'announcement-scheduler');
  perform cron.schedule(
    'announcement-scheduler',
    '*/10 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/announcement-scheduler',
      v_key
    )
  );
end $$;
