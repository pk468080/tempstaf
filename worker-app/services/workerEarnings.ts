import { supabase } from '../lib/supabase'

export type WorkerEarning = {
  id: string
  worker_id: string
  booking_id: string
  gross_amount: number
  platform_fee: number
  net_amount: number
  created_at: string
}

export async function getWorkerEarnings() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    throw new Error('Worker is not authenticated.')
  }

  const { data, error } = await supabase
    .from('worker_earnings')
    .select('*')
    .eq('worker_id', user.id)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (data ?? []) as WorkerEarning[]
}
