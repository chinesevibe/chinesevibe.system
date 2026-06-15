-- T24+T25: schedule evening-summary at 18:00 ICT Mon-Fri (11:00 UTC).
-- Rollback: select cron.unschedule('evening-summary');

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
    raise notice 'evening-summary cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('evening-summary')
    where exists (select 1 from cron.job where jobname = 'evening-summary');

  perform cron.schedule(
    'evening-summary',
    '0 11 * * 1-5',
    format(
      $job$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', %L),
        body := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/evening-summary',
      v_key
    )
  );
end $$;
