import { supabase } from '../../lib/supabase'

export type CustomerAddressInput = {
  latitude: number
  longitude: number
  address: string
}

export async function getOrCreateCustomerAddress(
  input: CustomerAddressInput,
): Promise<string> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  const userId =
    sessionData.session?.user.id

  if (!userId) {
    throw new Error(
      'A customer authentication session is required.',
    )
  }

  const { data: existingAddress, error: lookupError } =
    await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', userId)
      .eq('address_line', input.address)
      .eq('latitude', input.latitude)
      .eq('longitude', input.longitude)
      .limit(1)
      .maybeSingle()

  if (lookupError) {
    throw lookupError
  }

  if (existingAddress?.id) {
    return existingAddress.id
  }

  const { data: createdAddress, error: createError } =
    await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        address_line: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .select('id')
      .single()

  if (createError) {
    throw createError
  }

  if (!createdAddress?.id) {
    throw new Error(
      'The customer address was not created.',
    )
  }

  return createdAddress.id
}