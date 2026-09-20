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
  hourly_price?: number
  gross_amount?: number
  discount_amount?: number
  platform_fee?: number
  tax_amount?: number
  tax?: number
  final_amount?: number
  currency?: string
  commitment_days?: number | null
  timezone?: string
  discount_tier_id?: string | null
  discount_tier_name?: string | null
  discount_percent?: number
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

export async function calculateInstantBookingPrice(
  serviceVariantId: string,
  totalWorkingHours: number,
): Promise<BookingPriceResult> {
  const { data, error } = await supabase.rpc(
    'calculate_service_booking_price',
    {
      p_service_variant_id: serviceVariantId,
      p_total_working_hours: totalWorkingHours,
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'The backend did not return an instant booking price.',
    )
  }

  return {
    ...(data as BookingPriceResult),
    booking_type: 'instant',
    occurrence_count: 1,
    total_working_hours: totalWorkingHours,
    hours_per_occurrence: totalWorkingHours,
  }
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

  if (!data) {
    throw new Error(
      'The backend did not return booking pricing.',
    )
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