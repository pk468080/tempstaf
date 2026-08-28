declare module 'react-native-razorpay' {
  type RazorpayOptions = {
    key: string
   amount: string | number 
    currency: string
    name?: string
    description?: string
    order_id?: string
    prefill?: {
      name?: string
      email?: string
      contact?: string
    }
    notes?: Record<string, string>
    theme?: {
      color?: string
    }
  }

  type RazorpayResponse = {
    razorpay_payment_id: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }

  const RazorpayCheckout: {
    open(
      options: RazorpayOptions
    ): Promise<RazorpayResponse>
  }

  export default RazorpayCheckout
}