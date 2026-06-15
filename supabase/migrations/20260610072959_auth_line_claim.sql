-- T04: read line_user_id from app_metadata claim (set server-side at login).
-- Top-level claim kept first for forward-compat with a future access token hook.
-- Rollback: restore the T02 body (top-level claim only).

create or replace function hr_line_user_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'line_user_id', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'line_user_id', '')
  )
$$;
