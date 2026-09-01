/*
 * TempStaff Row-Level Security (RLS) Setup
 * 
 * This migration establishes RLS policies for all critical tables.
 * It ensures proper data isolation between customers, workers, and admins.
 * 
 * Deployment notes:
 * - Test in staging environment first
 * - Some RPC functions use SECURITY DEFINER to bypass RLS
 * - Monitor query performance after enabling RLS
 */

-- ============================================================================
-- Enable RLS on all critical tables
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.worker_earnings enable row level security;
alter table public.worker_locations enable row level security;
alter table public.booking_otps enable row level security;
alter table public.payments enable row level security;
alter table public.services enable row level security;
alter table public.worker_services enable row level security;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Users can read their own profile
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Users can update their own profile (limited fields via application logic)
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid());

-- Admins can read all profiles
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================

-- Customers can see bookings they created
create policy "bookings_customer_select"
on public.bookings for select
to authenticated
using (customer_id = auth.uid());

-- Workers can see bookings assigned to them
create policy "bookings_worker_select"
on public.bookings for select
to authenticated
using (worker_id = auth.uid());

-- Admins can see all bookings
create policy "bookings_admin_select"
on public.bookings for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- Customers can update limited fields (notes, preferences)
-- Never allow status/worker_id updates from client
create policy "bookings_customer_update"
on public.bookings for update
to authenticated
using (customer_id = auth.uid())
with check (
  -- Only allow non-critical field updates
  -- Status and worker_id cannot be changed by customer
  customer_id = auth.uid()
  and status = (select status from public.bookings where id = id)
  and worker_id = (select worker_id from public.bookings where id = id)
);

-- Worker booking updates MUST go through worker_booking_action RPC
-- No direct updates allowed from client
create policy "bookings_no_direct_worker_update"
on public.bookings for update
to authenticated
using (false);

-- Admins can update through restricted channels only
create policy "bookings_admin_update_via_rpc"
on public.bookings for update
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- No direct deletes (soft deletes via status field only)
create policy "bookings_no_delete"
on public.bookings for delete
to authenticated
using (false);

-- ============================================================================
-- WORKER_PROFILES TABLE
-- ============================================================================

-- Workers can read their own profile
create policy "worker_profiles_select_own"
on public.worker_profiles for select
to authenticated
using (id = auth.uid());

-- Workers can update their own profile
create policy "worker_profiles_update_own"
on public.worker_profiles for update
to authenticated
using (id = auth.uid());

-- Customers can read verified, available workers
create policy "worker_profiles_select_customer"
on public.worker_profiles for select
to authenticated
using (
  is_verified = true
  and worker_status in ('available', 'busy')
);

-- Admins can read all worker profiles
create policy "worker_profiles_select_admin"
on public.worker_profiles for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ============================================================================
-- ADDRESSES TABLE
-- ============================================================================

-- Customers can only access their own addresses
create policy "addresses_select_own"
on public.addresses for select
to authenticated
using (user_id = auth.uid());

create policy "addresses_insert_own"
on public.addresses for insert
to authenticated
with check (user_id = auth.uid());

create policy "addresses_update_own"
on public.addresses for update
to authenticated
using (user_id = auth.uid());

create policy "addresses_delete_own"
on public.addresses for delete
to authenticated
using (user_id = auth.uid());

-- ============================================================================
-- WORKER_EARNINGS TABLE
-- ============================================================================

-- Workers can read their own earnings
create policy "worker_earnings_select_own"
on public.worker_earnings for select
to authenticated
using (worker_id = auth.uid());

-- Admins can read all earnings
create policy "worker_earnings_select_admin"
on public.worker_earnings for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- No direct inserts/updates (created only via RPC on completion)
create policy "worker_earnings_no_direct_write"
on public.worker_earnings for all
to authenticated
using (false);

-- ============================================================================
-- WORKER_LOCATIONS TABLE
-- ============================================================================

-- Workers can insert their own location
create policy "worker_locations_insert_own"
on public.worker_locations for insert
to authenticated
with check (worker_id = auth.uid());

-- Customers can read location if they have an active booking with that worker
create policy "worker_locations_select_customer"
on public.worker_locations for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.customer_id = auth.uid()
    and b.worker_id = public.worker_locations.worker_id
    and b.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
  )
);

-- Workers can read their own locations
create policy "worker_locations_select_own"
on public.worker_locations for select
to authenticated
using (worker_id = auth.uid());

-- Admins can read all locations
create policy "worker_locations_select_admin"
on public.worker_locations for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ============================================================================
-- BOOKING_OTPS TABLE
-- ============================================================================

-- Only authenticated users can access OTPs (via verify-booking-otp edge function)
create policy "booking_otps_select_own"
on public.booking_otps for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = public.booking_otps.booking_id
    and (b.customer_id = auth.uid() or b.worker_id = auth.uid())
  )
);

-- Admins can read all OTPs
create policy "booking_otps_select_admin"
on public.booking_otps for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- No direct inserts/updates (created only via edge function)
create policy "booking_otps_no_direct_write"
on public.booking_otps for all
to authenticated
using (false);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

-- Customers can read their own payments
create policy "payments_select_customer"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = public.payments.booking_id
    and b.customer_id = auth.uid()
  )
);

-- Admins can read all payments
create policy "payments_select_admin"
on public.payments for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- No direct client inserts/updates (created via backend only)
create policy "payments_no_direct_write"
on public.payments for all
to authenticated
using (false);

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================

-- All authenticated users can read active services
create policy "services_select_authenticated"
on public.services for select
to authenticated
using (is_active = true);

-- Anonymous users can also read active services
create policy "services_select_anon"
on public.services for select
to anon
using (is_active = true);

-- Only admins can write services
create policy "services_write_admin"
on public.services for all
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ============================================================================
-- WORKER_SERVICES TABLE
-- ============================================================================

-- All users can read worker-service relationships
create policy "worker_services_select"
on public.worker_services for select
to authenticated
using (true);

-- Only admins can write worker-services (assign services to workers)
create policy "worker_services_write_admin"
on public.worker_services for all
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ============================================================================
-- BOOKING_STATUS_HISTORY TABLE (if exists)
-- ============================================================================

-- Customers can see history of their own bookings
create policy "booking_status_history_select_customer"
on public.booking_status_history for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = public.booking_status_history.booking_id
    and b.customer_id = auth.uid()
  )
);

-- Workers can see history of their own bookings
create policy "booking_status_history_select_worker"
on public.booking_status_history for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = public.booking_status_history.booking_id
    and b.worker_id = auth.uid()
  )
);

-- Admins can see all history
create policy "booking_status_history_select_admin"
on public.booking_status_history for select
to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
