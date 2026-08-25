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
  packageId: string
): Promise<RazorpayOrder> {
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

  const { data, error } =
    await supabase.functions.invoke(
      'create-razorpay-order',
      {
        body: {
          packageId,
        },
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    )

  if (error) {
    console.error(
      '[TempStaff] Razorpay order error:',
      error
    )

    throw new Error(
      error.message ||
        'Unable to create payment order.'
    )
  }

  if (!data?.success) {
    throw new Error(
      data?.error ||
        'Unable to create payment order.'
    )
  }

  return data as RazorpayOrder
}