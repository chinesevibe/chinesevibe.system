-- T10: schedule morning-push edge function at 09:00 ICT Mon-Fri (02:00 UTC).
-- Secrets come from Vault (names: project_url, secret_key) — never hardcoded.
-- On environments without those vault entries (e.g. fresh local) the schedule
-- step is skipped with a NOTICE; re-run the DO block after adding them.
-- Rollback: select cron.unschedule('morning-push');

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
    '0 2 * * 1-5',
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
