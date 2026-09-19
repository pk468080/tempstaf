import { supabase } from '../../lib/supabase'

export const TEMP_OTP = '123456'

export async function sendOtp(phone: string) {
  console.log('Development OTP:', TEMP_OTP)
  console.log('OTP requested for:', phone)

  return {
    success: true,
  }
}

export async function verifyOtp(
  phone: string,
  otp: string,
) {
  if (otp !== TEMP_OTP) {
    return {
      success: false,
      error: 'Invalid OTP',
    }
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  console.log(
    'Supabase session:',
    session ? 'present' : 'not present',
  )

  return {
    success: true,
    phone,
    session,
  }
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return session
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut()

  if (error) {
    throw error
  }
}