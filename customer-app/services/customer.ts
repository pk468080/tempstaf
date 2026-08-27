import { supabase } from '../lib/supabase'

export type CustomerProfileInput = {
  fullName: string
  companyName: string
}

export type CustomerProfile = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
  is_active: boolean | null
  company_name: string | null
  created_at: string | null
  updated_at: string | null
}

async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

  return user
}

export async function getCustomerProfile(): Promise<CustomerProfile> {
  const user = await getAuthenticatedUser()

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        id,
        full_name,
        phone,
        email,
        role,
        avatar_url,
        is_active,
        company_name,
        created_at,
        updated_at
      `
    )
    .eq('id', user.id)
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to load customer profile:',
      error
    )

    throw error
  }

  return data as CustomerProfile
}

export async function saveCustomerProfile(
  input: CustomerProfileInput
) {
  const user = await getAuthenticatedUser()

  const fullName = input.fullName.trim()
  const companyName = input.companyName.trim()

  if (fullName.length < 2) {
    throw new Error(
      'Please enter your full name.'
    )
  }

  if (companyName.length < 2) {
    throw new Error(
      'Please enter your company or business name.'
    )
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      company_name: companyName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error(
      '[TempStaff] Failed to save customer profile:',
      error
    )

    throw error
  }

  return data
}

export async function updateCustomerProfile(
  input: CustomerProfileInput
) {
  return saveCustomerProfile(input)
}

export async function signOutCustomer() {
  const { error } =
    await supabase.auth.signOut()

  if (error) {
    console.error(
      '[TempStaff] Customer sign out failed:',
      error
    )

    throw error
  }
}

export async function deleteCustomerAccount() {
  const user = await getAuthenticatedUser()

  /*
   * We deliberately do not call an admin-only
   * Supabase delete-user API from the client.
   *
   * Instead, deactivate the customer's profile
   * first. Actual Auth-user deletion can be wired
   * through a secure Edge Function later.
   */
  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error(
      '[TempStaff] Failed to deactivate customer account:',
      error
    )

    throw error
  }

  const { error: signOutError } =
    await supabase.auth.signOut()

  if (signOutError) {
    console.error(
      '[TempStaff] Customer sign out after account deletion failed:',
      signOutError
    )

    throw signOutError
  }
}