import { supabase } from '../lib/supabase'

export type CustomerProfileInput = {
  fullName: string
  companyName: string
}

export async function saveCustomerProfile(
  input: CustomerProfileInput
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'Customer is not authenticated.'
    )
  }

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