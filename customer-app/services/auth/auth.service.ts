import { supabase } from '../../lib/supabase'

export const TEMP_OTP = '123456'

export async function sendOtp(phone: string) {
  // Development-only OTP.
  // Replace this function's OTP delivery implementation
  // with the real SMS provider later.
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

  /*
   * Development authentication bridge:
   *
   * The fixed OTP proves the test user entered the
   * expected development code. We then obtain a real
   * Supabase Auth session so all database requests run
   * as an authenticated user.
   *
   * Later, only this OTP/session implementation needs
   * to be replaced by the real phone OTP flow.
   */
  const {
    data: existingSessionData,
    error: existingSessionError,
  } = await supabase.auth.getSession()

  if (existingSessionError) {
    return {
      success: false,
      error: existingSessionError.message,
    }
  }

  if (existingSessionData.session) {
    console.log('Supabase session: present')

    return {
      success: true,
      phone,
      session: existingSessionData.session,
    }
  }

  const {
    data: anonymousData,
    error: anonymousError,
  } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        phone,
      },
    },
  })

  if (anonymousError) {
    return {
      success: false,
      error: anonymousError.message,
    }
  }

  if (!anonymousData.session) {
    return {
      success: false,
      error: 'Supabase did not create an authentication session',
    }
  }

  console.log('Supabase session: present')
  console.log(
    'Supabase user:',
    anonymousData.user?.id ?? 'unknown',
  )

  return {
    success: true,
    phone,
    session: anonymousData.session,
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