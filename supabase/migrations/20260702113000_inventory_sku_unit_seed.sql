insert into public.inv_units (name, abbreviation)
select seed.name, seed.abbreviation
from (
  values
    ('ขวด', 'bottle'),
    ('กระป๋อง', 'can'),
    ('ลัง', 'carton')
) as seed(name, abbreviation)
where not exists (
  select 1
  from public.inv_units existing
  where lower(coalesce(existing.abbreviation, '')) = lower(seed.abbreviation)
     or lower(existing.name) = lower(seed.name)
);
