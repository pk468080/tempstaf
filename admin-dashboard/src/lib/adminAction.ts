import { supabase } from './supabase'

type AdminActionResult<T = unknown> = {
  data: T | null
  error: Error | null
}

/**
 * Execute a privileged admin operation through the
 * server-side admin-action Edge Function.
 *
 * The browser must never receive the Supabase service-role key.
 */
export async function adminAction<T = unknown>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<AdminActionResult<T>> {
  const { data, error } = await supabase.functions.invoke(
    'admin-action',
    {
      body: {
        action,
        params,
      },
    }
  )

  if (error) {
    return {
      data: null,
      error: new Error(
        error.message || 'Admin action failed.'
      ),
    }
  }

  if (data?.success === false) {
    return {
      data: null,
      error: new Error(
        typeof data.error === 'string'
          ? data.error
          : 'Admin action failed.'
      ),
    }
  }

  return {
    data: (data?.data ?? null) as T | null,
    error: null,
  }
}