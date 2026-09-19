import { supabase } from '../../lib/supabase'

export const TEMP_OTP = '123456'

export async function sendOtp(
  phone: string,
) {
  // Development-only OTP.
  // Replace this function's OTP delivery implementation
  // with the real SMS provider later.
  console.log(
    'Development OTP:',
    TEMP_OTP,
  )

  console.log(
    'OTP requested for:',
    phone,
  )

  return {
    success: true,
  }
}

async function ensureCustomerProfile(
  userId: string,
  phone: string,
  companyName: string,
) {
  const {
    data: existingProfile,
    error: lookupError,
  } = await supabase
    .from('profiles')
    .select(
      'id, role, is_active, company_name',
    )
    .eq('id', userId)
    .maybeSingle()

  if (lookupError) {
    throw lookupError
  }

  if (existingProfile) {
    if (
      existingProfile.role !==
        'customer' ||
      existingProfile.is_active !== true
    ) {
      throw new Error(
        'The authenticated account is not an active customer account.',
      )
    }

    return existingProfile
  }

  const {
    data: createdProfile,
    error: createError,
  } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      phone,
      company_name: companyName,
    })
    .select(
      'id, role, is_active, company_name',
    )
    .single()

  if (createError) {
    throw createError
  }

  if (!createdProfile) {
    throw new Error(
      'The customer profile was not created.',
    )
  }

  if (
    createdProfile.role !==
      'customer' ||
    createdProfile.is_active !== true
  ) {
    throw new Error(
      'The customer profile is not active.',
    )
  }

  return createdProfile
}

async function getAuthenticatedCustomer(
  phone: string,
  companyName: string,
) {
  const {
    data: sessionData,
    error: sessionError,
  } =
    await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (sessionData.session) {
    const user =
      sessionData.session.user

    if (!user) {
      throw new Error(
        'The authentication session does not contain a user.',
      )
    }

    await ensureCustomerProfile(
      user.id,
      phone,
      companyName,
    )

    return sessionData.session
  }

  const {
    data: anonymousData,
    error: anonymousError,
  } =
    await supabase.auth.signInAnonymously({
      options: {
        data: {
          phone,
          company_name: companyName,
        },
      },
    })

  if (anonymousError) {
    throw anonymousError
  }

  if (!anonymousData.session) {
    throw new Error(
      'Supabase did not create an authentication session.',
    )
  }

  if (!anonymousData.user) {
    throw new Error(
      'Supabase did not return an authenticated user.',
    )
  }

  await ensureCustomerProfile(
    anonymousData.user.id,
    phone,
    companyName,
  )

  console.log(
    'Supabase session: present',
  )

  console.log(
    'Supabase user:',
    anonymousData.user.id,
  )

  return anonymousData.session
}

export async function verifyOtp(
  phone: string,
  otp: string,
  companyName: string,
) {
  if (otp !== TEMP_OTP) {
    return {
      success: false,
      error: 'Invalid OTP',
    }
  }

  const trimmedCompanyName =
    companyName.trim()

  if (!trimmedCompanyName) {
    return {
      success: false,
      error:
        'Company name is required.',
    }
  }

  try {
    const session =
      await getAuthenticatedCustomer(
        phone,
        trimmedCompanyName,
      )

    console.log(
      'Customer authentication setup complete.',
    )

    return {
      success: true,
      phone,
      session,
    }
  } catch (error) {
    console.error(
      'Customer authentication setup failed:',
      error,
    )

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to create the customer account.',
    }
  }
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } =
    await supabase.auth.getSession()

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