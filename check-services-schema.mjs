import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('admin-dashboard/.env', 'utf8')

const getEnv = (name) => {
  const line = env
    .split('\n')
    .find((l) => l.startsWith(name + '='))
  return line?.split('=').slice(1).join('=').trim()
}

const supabase = createClient(
  getEnv('VITE_SUPABASE_URL'),
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')
)

const { data, error } = await supabase
  .from('services')
  .select('*')
  .limit(1)

console.log('--- SERVICES SAMPLE ---')
console.log(JSON.stringify(data, null, 2))

console.log('\n--- ERROR ---')
console.log(error)
