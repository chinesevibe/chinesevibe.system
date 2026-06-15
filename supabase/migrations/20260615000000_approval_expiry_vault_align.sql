-- T76.1: align approval-expiry cron with vault secret names used by contract-alert
-- Rollback: SELECT cron.unschedule('approval-expiry');

do $cron$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'secret_key' limit 1;

  if v_url is null then
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'supabase_url' limit 1;
  end if;
  if v_key is null then
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  end if;

  if v_url is null or v_key is null then
    raise notice 'approval-expiry cron skipped: vault secrets not set (project_url + secret_key)';
    return;
  end if;

  perform cron.unschedule('approval-expiry')
    where exists (select 1 from cron.job where jobname = 'approval-expiry');

  perform cron.schedule(
    'approval-expiry',
    '0 * * * *',
    format(
      $job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L,
          'apikey', %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_url || '/functions/v1/approval-expiry',
      v_key,
      v_key
    )
  );
end;
$cron$;
