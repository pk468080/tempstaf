import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('admin-dashboard/.env', 'utf8')

const url = env.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
const key = env.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m)?.[1]?.trim()

if (!url || !key) {
  console.log('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(url, key)

console.log('\n--- ALL PROFILES ---')

const { data, error } = await supabase
  .from('profiles')
  .select('id, full_name, role, is_active')
  .limit(50)

console.log('DATA:')
console.log(data)

console.log('\nERROR:')
console.log(error)

console.log('\n--- CUSTOMER ROLE ---')

const { data: customers, error: customerError } = await supabase
  .from('profiles')
  .select('id, full_name, role, is_active')
  .eq('role', 'customer')

console.log('CUSTOMERS:')
console.log(customers)

console.log('\nCUSTOMER ERROR:')
console.log(customerError)
