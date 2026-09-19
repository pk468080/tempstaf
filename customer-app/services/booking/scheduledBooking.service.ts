import { supabase } from '../../lib/supabase'

export type ScheduledBookingResult = {
  booking_id: string
  occurrence_count: number
  total_working_hours: number
  gross_amount: number
  discount_amount: number
  final_amount: number
  currency: string
  timezone: string
}

type CreateScheduledBookingInput = {
  serviceVariantId: string
  addressId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  excludedDates: string[]
  notes?: string | null
}

export async function createCustomerScheduledBooking(
  input: CreateScheduledBookingInput,
): Promise<ScheduledBookingResult> {
  const { data, error } =
    await supabase.rpc(
      'create_customer_scheduled_range_booking',
      {
        p_service_variant_id:
          input.serviceVariantId,

        p_address_id:
          input.addressId,

        p_schedule_start_date:
          input.startDate,

        p_schedule_end_date:
          input.endDate,

        p_daily_start_time:
          input.startTime,

        p_daily_end_time:
          input.endTime,

        p_off_dates:
          input.excludedDates,

        p_notes:
          input.notes ?? null,
      },
    )

  if (error) {
    throw error
  }

  return data as ScheduledBookingResult
}