import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

const { data, error } = await supabase
  .from('payments')
  .select('*')
  .limit(5)

console.log('===== PAYMENTS =====')
console.log(JSON.stringify(data, null, 2))
console.log('ERROR:')
console.log(error)
