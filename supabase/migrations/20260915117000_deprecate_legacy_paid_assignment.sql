-- ============================================================
-- TempStaff
-- Deprecate the legacy single-worker paid assignment RPC.
--
-- Worker assignment now occurs through:
--   1. dispatch_booking_worker_offers()
--   2. worker_respond_to_offer()
--   3. admin_assign_booking_worker() for admin override
--
-- Keep the function itself for historical compatibility,
-- but prevent normal authenticated clients from invoking it.
-- ============================================================

revoke execute
on function public.assign_paid_booking_worker(uuid)
from public;

revoke execute
on function public.assign_paid_booking_worker(uuid)
from anon;

revoke execute
on function public.assign_paid_booking_worker(uuid)
from authenticated;