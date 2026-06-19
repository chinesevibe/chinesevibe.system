-- ATT-CUTOFF-001: run attendance-cutoff at 06:00 ICT every day.
-- Rollback: select cron.unschedule('attendance-cutoff');

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
    raise notice 'attendance-cutoff cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('attendance-cutoff')
    where exists (select 1 from cron.job where jobname = 'attendance-cutoff');

  -- 23:00 UTC = 06:00 ICT (UTC+7)
  perform cron.schedule(
    'attendance-cutoff',
    '0 23 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/attendance-cutoff',
      v_key
    )
  );
end $$;
