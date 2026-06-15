-- T80: expire pending approvals past 48h SLA — hourly check

do $cron$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'supabase_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'approval-expiry cron skipped: vault secrets not set';
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
