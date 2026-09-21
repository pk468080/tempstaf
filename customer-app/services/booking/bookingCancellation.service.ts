import { supabase } from '../../lib/supabase'

export type CustomerCancellationResult = {
  success: boolean
  booking_id?: string
  occurrence_id?: string
  status?: string
  refund?: {
    hours_before_start?: number
    refund_percentage?: number
    cancellation_fee?: number
    refund_amount?: number
    gross_amount?: number
  }
  refund_amount?: number
  refund_id?: string
}

export async function cancelCustomerBooking(
  bookingId: string,
  bookingType?: string | null,
): Promise<CustomerCancellationResult> {
  const functionName =
    bookingType === 'recurring'
      ? 'cancel_customer_booking_series'
      : 'cancel_customer_booking'

  const { data, error } = await supabase.rpc(
    functionName,
    {
      p_booking_id: bookingId,
      p_reason: 'Customer cancellation',
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  const result = data as CustomerCancellationResult | null

  if (!result?.success) {
    throw new Error('Unable to cancel the booking.')
  }

  return result
}
