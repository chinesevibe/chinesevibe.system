-- T22: schedule visa-alert edge function daily at 09:35 ICT (02:35 UTC).
-- Rollback: select cron.unschedule('visa-alert');

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
    raise notice 'visa-alert cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('visa-alert')
    where exists (select 1 from cron.job where jobname = 'visa-alert');

  perform cron.schedule(
    'visa-alert',
    '35 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/visa-alert',
      v_key
    )
  );
end $$;
