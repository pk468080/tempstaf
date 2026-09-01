revoke execute on function public.complete_test_payment(uuid) from public, anon;
revoke execute on function public.get_eligible_workers(uuid) from public, anon;
revoke execute on function public.admin_assign_booking_worker(uuid, uuid) from public, anon;
revoke execute on function public.worker_booking_action(uuid, text) from public, anon;
revoke execute on function public.set_worker_services(uuid[]) from public, anon;

grant execute on function public.complete_test_payment(uuid) to authenticated;
grant execute on function public.get_eligible_workers(uuid) to authenticated;
grant execute on function public.admin_assign_booking_worker(uuid, uuid) to authenticated;
grant execute on function public.worker_booking_action(uuid, text) to authenticated;
grant execute on function public.set_worker_services(uuid[]) to authenticated;
