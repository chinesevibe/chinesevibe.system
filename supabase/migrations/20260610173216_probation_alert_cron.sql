-- T21: schedule probation-alert edge function daily at 09:30 ICT (02:30 UTC).
-- Daily (not Mon-Fri) so milestones that fall on weekends still alert.
-- Secrets come from Vault (names: project_url, secret_key — same entries
-- morning-push uses) — never hardcoded. On environments without those vault
-- entries (e.g. fresh local) the schedule step is skipped with a NOTICE;
-- re-run the DO block after adding them.
-- Rollback: select cron.unschedule('probation-alert');

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
    raise notice 'probation-alert cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('probation-alert')
    where exists (select 1 from cron.job where jobname = 'probation-alert');

  perform cron.schedule(
    'probation-alert',
    '30 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/probation-alert',
      v_key
    )
  );
end $$;
