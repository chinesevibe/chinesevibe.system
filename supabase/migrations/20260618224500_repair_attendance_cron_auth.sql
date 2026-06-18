-- repair_attendance_cron_auth: ensure shift-attendance-summary cron uses
-- the correct header format for @supabase/server secret auth.
--
-- @supabase/server { auth: ["secret"] } validates the `apikey` request header
-- against the configured secretKeys. Production cron Vault `secret_key` is the
-- Supabase service-role JWT. We send it as `apikey` — NOT `Authorization` —
-- because secret mode reads apikey, not the bearer token slot.
--
-- Edge function overrides: cronSecretAuthConfig() maps SUPABASE_SERVICE_ROLE_KEY
-- into env.secretKeys.default so the JWT from Vault is accepted by the function.
--
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
    raise notice 'repair_attendance_cron_auth: vault secrets project_url / secret_key not set — skipping cron schedule';
    return;
  end if;

  -- Idempotent: remove existing job before re-creating
  perform cron.unschedule('shift-attendance-summary')
    where exists (select 1 from cron.job where jobname = 'shift-attendance-summary');

  perform cron.schedule(
    'shift-attendance-summary',
    '*/15 * * * 1-5',
    format(
      $job$select net.http_post(
        url     := %L,
        headers := '{"Content-Type": "application/json", "apikey": %s}'::jsonb,
        body    := '{}'::jsonb
      )$job$,
      v_url || '/functions/v1/shift-attendance-summary',
      to_json(v_key)::text
    )
  );
end $$;
