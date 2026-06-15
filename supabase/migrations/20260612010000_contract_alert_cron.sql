-- T72: contract-alert daily 09:00 ICT (02:00 UTC)
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
    raise notice 'contract-alert cron skipped: vault secrets not set';
    return;
  end if;

  perform cron.unschedule('contract-alert')
    where exists (select 1 from cron.job where jobname = 'contract-alert');

  perform cron.schedule(
    'contract-alert',
    '0 2 * * *',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/contract-alert',
      v_key
    )
  );
end $$;
