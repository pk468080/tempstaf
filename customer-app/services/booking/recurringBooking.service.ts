import { supabase } from '../../lib/supabase'

export type RecurringBookingResult = {
  booking_id: string
  occurrence_count: number
  total_working_hours: number
  gross_amount: number
  discount_amount: number
  final_amount: number
  currency: string
  timezone: string
}

type CreateRecurringBookingInput = {
  serviceVariantId: string
  addressId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  selectedWeekdays: number[]
  excludedDates: string[]
  notes?: string | null
}

export async function createCustomerRecurringBooking(
  input: CreateRecurringBookingInput,
): Promise<RecurringBookingResult> {
  const { data, error } = await supabase.rpc(
    'create_customer_recurring_booking',
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

      p_selected_weekdays:
        input.selectedWeekdays,

      p_off_dates:
        input.excludedDates,

      p_notes:
        input.notes ?? null,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'The backend did not return a booking result.',
    )
  }

  return data as RecurringBookingResult
}