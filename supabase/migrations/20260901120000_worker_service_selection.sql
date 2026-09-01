create or replace function public.set_worker_services(
  p_service_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_worker_id uuid := auth.uid();
  v_service_count integer;
begin
  if v_worker_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  end if;

  if p_service_ids is null or array_length(p_service_ids, 1) is null or array_length(p_service_ids, 1) = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Select at least one service'
    );
  end if;

  if not exists (
    select 1
    from public.worker_profiles
    where id = v_worker_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Worker profile not found'
    );
  end if;

  select count(*)
  into v_service_count
  from unnest(p_service_ids) as service_id(id)
  join public.services s
    on s.id = service_id.id
  where s.is_active = true;

  if v_service_count <> array_length(p_service_ids, 1) then
    return jsonb_build_object(
      'success', false,
      'error', 'One or more selected services are invalid'
    );
  end if;

  delete from public.worker_services
  where worker_id = v_worker_id;

  insert into public.worker_services (worker_id, service_id)
  select v_worker_id, service_id.id
  from unnest(p_service_ids) as service_id(id)
  on conflict (worker_id, service_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'worker_id', v_worker_id,
    'service_count', array_length(p_service_ids, 1)
  );
end;
$function$;

revoke execute on function public.set_worker_services(uuid[]) from anon;
grant execute on function public.set_worker_services(uuid[]) to authenticated;

create policy "worker_services_write_self"
on public.worker_services
for all
to authenticated
using (worker_id = auth.uid())
with check (worker_id = auth.uid());
