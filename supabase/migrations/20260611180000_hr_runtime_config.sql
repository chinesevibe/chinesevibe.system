-- Runtime key/value for ops (e.g. captured LINE group id). Service role only.
create table if not exists public.hr_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.hr_runtime_config enable row level security;

create or replace function hr_runtime_config_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hr_runtime_config_updated_at on public.hr_runtime_config;
create trigger hr_runtime_config_updated_at
  before update on public.hr_runtime_config
  for each row execute function hr_runtime_config_set_updated_at();
