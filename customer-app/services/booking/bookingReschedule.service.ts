import { supabase } from '../../lib/supabase'

export type CustomerRescheduleResult = {
  success: boolean
  booking_id?: string
  occurrence_id?: string
  scheduled_start?: string
  scheduled_end?: string
  previous_scheduled_start?: string
  previous_scheduled_end?: string
  timezone?: string
}

export async function rescheduleCustomerBooking(
  bookingId: string,
  newStart: string,
  newEnd: string,
): Promise<CustomerRescheduleResult> {
  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  if (!newStart || !newEnd) {
    throw new Error('New booking time is required.')
  }

  const { data, error } = await supabase.rpc(
    'reschedule_customer_booking',
    {
      p_booking_id: bookingId,
      p_new_start: newStart,
      p_new_end: newEnd,
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  const result = data as CustomerRescheduleResult | null

  if (!result?.success) {
    throw new Error('Unable to reschedule the booking.')
  }

  return result
}