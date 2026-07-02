-- Attendance reporting: keep only one LINE summary/reminder round at 14:10 ICT on weekdays.
-- Disable per-shift summary pushes, reschedule aggregate evening-summary, and
-- align morning-push runtime settings with the same single round.
-- Rollback:
--   select cron.unschedule('shift-attendance-summary');
--   select cron.unschedule('evening-summary');
--   select cron.unschedule('morning-push');

create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into public.hr_runtime_config (key, value)
values
  ('morning_push_employee_fallback_time', '14:10'),
  ('morning_push_employee_fallback_time_2', '14:10'),
  ('morning_push_officer_fallback_time', '14:10'),
  ('morning_push_officer_fallback_time_2', '14:10')
on conflict (key) do update
set value = excluded.value;

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
    raise notice 'attendance summary cron skipped: vault secrets project_url / secret_key not set';
    return;
  end if;

  perform cron.unschedule('shift-attendance-summary')
    where exists (select 1 from cron.job where jobname = 'shift-attendance-summary');

  perform cron.unschedule('evening-summary')
    where exists (select 1 from cron.job where jobname = 'evening-summary');

  perform cron.unschedule('morning-push')
    where exists (select 1 from cron.job where jobname = 'morning-push');

  perform cron.schedule(
    'evening-summary',
    '10 7 * * 1-5',
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

  perform cron.schedule(
    'morning-push',
    '10 7 * * 1-5',
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
