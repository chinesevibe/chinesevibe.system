create or replace function public.inv_cancel_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.inv_transfers%rowtype;
begin
  if not public.inv_can_manage_requisitions() then
    raise exception 'forbidden';
  end if;

  select * into v_transfer
  from public.inv_transfers
  where id = p_transfer_id
  for update;

  if not found then
    raise exception 'transfer not found';
  end if;

  if v_transfer.status <> 'draft' then
    raise exception 'only draft transfers can be cancelled';
  end if;

  update public.inv_transfers
  set status = 'cancelled',
      updated_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function public.inv_cancel_transfer(uuid) from public;
grant execute on function public.inv_cancel_transfer(uuid) to authenticated;
