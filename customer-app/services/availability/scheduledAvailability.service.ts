import { supabase } from '../../lib/supabase'

export type ScheduledAvailabilitySlot = {
	start: string
	end: string
	available_worker_count: number
}

export type ScheduledAvailabilityResult = {
	service_area_available: boolean
	slots: ScheduledAvailabilitySlot[]
}

export async function getScheduledAvailabilitySlots(
	serviceVariantId: string,
	addressId: string,
	start: string,
	end: string,
	durationHours = 1,
): Promise<ScheduledAvailabilityResult> {
	const { data, error } = await supabase.rpc(
		'get_customer_scheduled_availability_slots',
		{
			p_service_variant_id: serviceVariantId,
			p_address_id: addressId,
			p_start: start,
			p_end: end,
			p_duration_hours: durationHours,
		},
	)

	if (error) {
		throw error
	}

	if (!data || typeof data !== 'object') {
		throw new Error('The backend did not return availability slots.')
	}

	const result = data as {
		service_area_available?: unknown
		slots?: unknown
	}

	return {
		service_area_available: result.service_area_available === true,
		slots: Array.isArray(result.slots)
			? result.slots as ScheduledAvailabilitySlot[]
			: [],
	}
}
