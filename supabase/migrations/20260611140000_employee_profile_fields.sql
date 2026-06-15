-- T14: additional employee profile fields

alter table hr_employees
  add column if not exists date_of_birth date,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists contract_type text
    check (contract_type is null or contract_type in ('full_time', 'part_time', 'contract'));
