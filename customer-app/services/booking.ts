export function createDevelopmentBookingId() {
  return `TS-${Date.now().toString().slice(-8)}`
}

export function verifyDevelopmentLoginOtp(otp: string) {
  return otp === '123456'
}

export function verifyDevelopmentStartOtp(otp: string) {
  return otp === '246810'
}

export function verifyDevelopmentEndOtp(otp: string) {
  return otp === '864201'
}
