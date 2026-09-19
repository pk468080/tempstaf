import { supabase } from '../../lib/supabase'

export type BookingPriceResult = {
  success: boolean
  pricing_engine?: string
  service_id?: string
  service_variant_id?: string
  booking_type?: string
  occurrence_count?: number
  hours_per_occurrence?: number
  total_working_hours?: number
  gross_amount?: number
  discount_amount?: number
  final_amount?: number
  currency?: string
  commitment_days?: number | null
  timezone?: string
  occurrences?: unknown[]
}

type CalculateMultiOccurrencePricingInput = {
  serviceVariantId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  selectedWeekdays: number[]
  excludedDates: string[]
  bookingType: 'scheduled' | 'recurring'
}

export async function calculateMultiOccurrenceBookingPrice(
  input: CalculateMultiOccurrencePricingInput,
): Promise<BookingPriceResult> {
  const { data, error } = await supabase.rpc(
    'calculate_multi_occurrence_booking_price',
    {
      p_service_variant_id:
        input.serviceVariantId,

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

      p_booking_type:
        input.bookingType,
    },
  )

  if (error) {
    throw error
  }

  return data as BookingPriceResult
}

export async function calculateScheduledBookingPrice(
  input: Omit<
    CalculateMultiOccurrencePricingInput,
    'selectedWeekdays' | 'bookingType'
  >,
): Promise<BookingPriceResult> {
  return calculateMultiOccurrenceBookingPrice({
    ...input,

    selectedWeekdays: [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
    ],

    bookingType: 'scheduled',
  })
}