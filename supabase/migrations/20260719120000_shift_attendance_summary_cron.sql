-- ATT-ROSTER-001: run shift-attendance-summary every 15 minutes on weekdays.
-- (Re-applied with unique version — 20260618170000 slot was taken by another migration.)
-- Rollback: select cron.unschedule('shift-attendance-summary');

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
    raise notice 'shift-attendance-summary cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('shift-attendance-summary')
    where exists (select 1 from cron.job where jobname = 'shift-attendance-summary');

  perform cron.schedule(
    'shift-attendance-summary',
    '*/15 * * * 1-5',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/shift-attendance-summary',
      v_key
    )
  );
end $$;
