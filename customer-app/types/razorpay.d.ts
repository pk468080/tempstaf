declare module 'react-native-razorpay' {
  type RazorpayOptions = {
    key: string
    amount: number
    currency: string
    order_id: string
    name?: string
    description?: string
  }

  type RazorpaySuccess = {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }

  const RazorpayCheckout: {
    open(
      options: RazorpayOptions,
    ): Promise<RazorpaySuccess>
  }

  export default RazorpayCheckout
}