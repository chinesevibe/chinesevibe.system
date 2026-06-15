-- Employee bank account + salary payment method (cash vs bank transfer)

alter table public.hr_employees
  add column if not exists salary_payment_method text
    check (salary_payment_method is null or salary_payment_method in ('cash', 'bank')),
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch text;

comment on column public.hr_employees.salary_payment_method is 'cash = รับเงินสด, bank = โอนเข้าบัญชีธนาคาร';
