import { supabase } from '../../lib/supabase'

export type InstantBookingResult = {
	booking_id: string
	occurrence_count: number
	total_working_hours: number
	gross_amount: number
	discount_amount: number
	final_amount: number
	currency: string
	timezone: string
	instant_available?: boolean
	fallback_to_scheduled?: boolean
}

export type CreateInstantBookingInput = {
	serviceVariantId: string
	addressId: string
	startTime: string
	endTime: string
	notes?: string | null
}

export async function createCustomerInstantBooking(
	input: CreateInstantBookingInput,
): Promise<InstantBookingResult> {
	const { data, error } = await supabase.rpc(
		'create_customer_hourly_booking',
		{
			p_service_variant_id: input.serviceVariantId,
			p_address_id: input.addressId,
			p_booking_type: 'instant',
			p_scheduled_start: input.startTime,
			p_scheduled_end: input.endTime,
			p_notes: input.notes ?? null,
		},
	)

	if (error) {
		throw error
	}

	if (!data) {
		throw new Error('The backend did not return a booking result.')
	}

	return data as InstantBookingResult
}
