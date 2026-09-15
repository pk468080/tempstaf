-- ============================================================
-- TempStaff
-- Harden admin booking assignment RPC privileges
-- ============================================================

revoke execute
on function public.admin_assign_booking_worker(uuid, uuid)
from public;

revoke execute
on function public.admin_assign_booking_worker(uuid, uuid)
from anon;

grant execute
on function public.admin_assign_booking_worker(uuid, uuid)
to authenticated;