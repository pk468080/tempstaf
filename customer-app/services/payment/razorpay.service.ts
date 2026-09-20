import { supabase } from '../../lib/supabase'

export type RazorpayOrder = {
  keyId: string
  orderId: string
  amount: number
  currency: string
  alreadyPaid?: boolean
  paymentId?: string
  status?: string
}

export type RazorpayPaymentResult = {
  success: boolean
  bookingId: string
  paymentId: string
  status: string
}

export type RazorpayCheckoutResult = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export async function markRazorpayPaymentFailed(
  bookingId: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    'create-razorpay-order',
    {
      body: {
        bookingId,
        action: 'mark_payment_failed',
      },
    },
  )

  if (error) {
    throw error
  }

  const result = data as Record<string, unknown> | null

  if (result?.success !== true) {
    throw new Error(
      'Unable to update the booking payment status.',
    )
  }
}

export async function createRazorpayOrder(
  bookingId: string,
  expectedAmount: number,
  expectedCurrency: string,
): Promise<RazorpayOrder> {
  const { data: booking, error: bookingError } =
    await supabase
      .from('bookings')
      .select('service_variant_id')
      .eq('id', bookingId)
      .single()

  if (bookingError) {
    throw bookingError
  }

  const packageId = (
    booking as {
      service_variant_id?: unknown
    }
  ).service_variant_id

  if (
    typeof packageId !== 'string' ||
    packageId.length === 0
  ) {
    throw new Error(
      'The booking service variant is missing.',
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'create-razorpay-order',
      {
        body: {
          bookingId,
          packageId,
        },
      },
    )

  if (error) {
    throw error
  }

  const result =
    data as Record<string, unknown> | null

  /*
   * The server found a Razorpay order that was already
   * successfully paid and reconciled it with TempStaff.
   *
   * In this case we must NOT open Razorpay Checkout again.
   */
  if (
    result?.success === true &&
    result?.alreadyPaid === true
  ) {
    return {
      keyId:
        typeof result.keyId === 'string'
          ? result.keyId
          : '',
      orderId:
        typeof result.orderId === 'string'
          ? result.orderId
          : '',
      amount:
        typeof result.amount === 'number'
          ? result.amount
          : Math.round(expectedAmount * 100),
      currency:
        typeof result.currency === 'string'
          ? result.currency
          : expectedCurrency,
      alreadyPaid: true,
      paymentId:
        typeof result.paymentId === 'string'
          ? result.paymentId
          : undefined,
      status:
        typeof result.status === 'string'
          ? result.status
          : 'paid',
    }
  }

  const amount = Number(result?.amount) / 100

  if (
    result?.success !== true ||
    typeof result.keyId !== 'string' ||
    typeof result.orderId !== 'string' ||
    !Number.isFinite(amount) ||
    Math.round(amount * 100) !==
      Math.round(expectedAmount * 100) ||
    result.currency !== expectedCurrency
  ) {
    throw new Error(
      'The payment order does not match the booking amount.',
    )
  }

  return {
    keyId: result.keyId,
    orderId: result.orderId,
    amount: Number(result.amount),
    currency: result.currency,
    alreadyPaid: false,
  }
}

export async function verifyRazorpayPayment(
  bookingId: string,
  checkout: RazorpayCheckoutResult,
): Promise<RazorpayPaymentResult> {
  const { data, error } =
    await supabase.functions.invoke(
      'verify-razorpay-payment',
      {
        body: {
          bookingId,
          razorpayOrderId:
            checkout.razorpay_order_id,
          razorpayPaymentId:
            checkout.razorpay_payment_id,
          razorpaySignature:
            checkout.razorpay_signature,
        },
      },
    )

  if (error) {
    throw error
  }

  const result =
    data as Record<string, unknown> | null

  if (
    result?.success !== true ||
    typeof result.bookingId !== 'string' ||
    typeof result.paymentId !== 'string' ||
    typeof result.status !== 'string'
  ) {
    throw new Error(
      'Payment verification failed.',
    )
  }

  return {
    success: true,
    bookingId: result.bookingId,
    paymentId: result.paymentId,
    status: result.status,
  }
}