import { supabase } from '../../lib/supabase'

export type BookingStatus =
	| 'pending_payment'
	| 'paid'
	| 'searching_worker'
	| 'assigned'
	| 'on_the_way'
	| 'arrived'
	| 'in_progress'
	| 'completed'
	| 'cancelled'
	| 'expired'
	| 'payment_failed'

export type CustomerBooking = {
	id: string
	status: BookingStatus
	service_name: string | null
	scheduled_start: string | null
	scheduled_end: string | null
	total_working_hours: number | null
	total_amount: number | null
	worker_id: string | null
	started_at: string | null
	completed_at: string | null
	journey_started_at: string | null
	arrived_at: string | null
}

export type WorkerLocation = {
	latitude: number
	longitude: number
	recorded_at: string
}

export async function getCustomerBooking(
	bookingId: string,
): Promise<CustomerBooking> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, status, scheduled_start, scheduled_end, total_working_hours, total_amount, worker_id, started_at, completed_at, journey_started_at, arrived_at, service_variant:service_variants(service:services(name))',
		)
		.eq('id', bookingId)
		.single()

	if (error) {
		throw error
	}

	const row = data as unknown as CustomerBooking & {
		service_variant?: { service?: { name?: string } | null } | null
	}

	return {
		...row,
		service_name: row.service_variant?.service?.name ?? null,
	}
}

export async function getLatestWorkerLocation(
	bookingId: string,
): Promise<WorkerLocation | null> {
	const { data, error } = await supabase
		.from('worker_locations')
		.select('latitude, longitude, recorded_at')
		.eq('booking_id', bookingId)
		.order('recorded_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error) {
		throw error
	}

	return data as WorkerLocation | null
}

export async function requestBookingOtp(
	bookingId: string,
	otpType: 'start' | 'end',
) {
	const { data, error } = await supabase.functions.invoke(
		'create-booking-otp',
		{ body: { bookingId, otpType } },
	)

	if (error) {
		throw error
	}

	const result = data as { success?: boolean; otp?: string; expiresAt?: string }
	if (result.success !== true) {
		throw new Error('Unable to generate the booking OTP.')
	}

	return result
}
