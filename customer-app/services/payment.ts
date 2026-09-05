import { supabase } from '../lib/supabase'

type RazorpayOrder = {
  success: boolean
  keyId: string
  orderId: string
  amount: number
  currency: string
  receipt: string
  error?: string
}

export async function createRazorpayOrder(
  packageId: string,
  bookingId: string,
) {
  if (!packageId) {
    throw new Error('Package ID is required.')
  }

  if (!bookingId) {
    throw new Error('Booking ID is required.')
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'create-razorpay-order',
    {
      body: {
        packageId,
        bookingId,
      },
    },
  )

  if (error) {
    console.error(
      '[TempStaff] Failed to create Razorpay order:',
      error,
    )

    throw new Error(
      error.message ||
        'Unable to create Razorpay order.',
    )
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        'Unable to create Razorpay order.',
    )
  }

  return {
    keyId: String(data.keyId),
    orderId: String(data.orderId),
    amount: Number(data.amount),
    currency: String(
      data.currency || 'INR',
    ),
  }
}
export async function verifyRazorpayPayment(
  bookingId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session?.access_token) {
    throw new Error(
      'Your session has expired. Please log in again.'
    )
  }

  if (!bookingId) {
    throw new Error(
      'Booking ID is required.'
    )
  }

  if (!razorpayOrderId) {
    throw new Error(
      'Razorpay order ID is missing.'
    )
  }

  if (!razorpayPaymentId) {
    throw new Error(
      'Razorpay payment ID is missing.'
    )
  }

  if (!razorpaySignature) {
    throw new Error(
      'Razorpay payment signature is missing.'
    )
  }

  const { data, error } =
    await supabase.functions.invoke(
      'verify-razorpay-payment',
      {
        body: {
          bookingId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Razorpay verification error:',
      error
    )

    throw new Error(
      error.message ||
        'Unable to verify payment.'
    )
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        'Unable to verify payment.'
    )
  }

  return data
}