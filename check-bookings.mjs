import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync(
  'admin-dashboard/.env',
  'utf8'
)

const url = env
  .match(/VITE_SUPABASE_URL=(.*)/)?.[1]
  ?.trim()

const key = env
  .match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)?.[1]
  ?.trim()

if (!url) {
  throw new Error('VITE_SUPABASE_URL is missing')
}

if (!key) {
  throw new Error(
    'VITE_SUPABASE_PUBLISHABLE_KEY is missing'
  )
}

const supabase = createClient(url, key)

const { data, error, count } =
  await supabase
    .from('bookings')
    .select('*', { count: 'exact' })

console.log('--- BOOKINGS COUNT ---')
console.log(count)

console.log('\n--- BOOKINGS ---')
console.log(
  JSON.stringify(data, null, 2)
)

console.log('\n--- ERROR ---')
console.log(error)