import { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AdminActionResult<T> = {
  data: T | null
  error: PostgrestError | null
}

export async function adminAction<T = unknown>(
  functionName: string,
  params: Record<string, unknown> = {},
): Promise<AdminActionResult<T>> {
  const { data, error } = await supabase.rpc(
    functionName,
    params,
  )

  return {
    data: data as T | null,
    error,
  }
}