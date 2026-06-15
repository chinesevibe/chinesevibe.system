-- T155-A: run morning-push every 15 minutes so edge config can control
-- employee/officer day + time gating. Rollback to old fixed slot if needed:
--   select cron.unschedule('morning-push');
--   -- then re-run 20260610111320_morning_push_cron.sql

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
    raise notice 'morning-push cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('morning-push')
    where exists (select 1 from cron.job where jobname = 'morning-push');

  perform cron.schedule(
    'morning-push',
    '*/15 * * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/morning-push',
      v_key
    )
  );
end $$;
