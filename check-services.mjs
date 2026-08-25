import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')

const getEnv = (name) => {
  const line = env
    .split('\n')
    .find((l) => l.startsWith(name + '='))
  return line?.split('=').slice(1).join('=').trim()
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')

const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

const { data, error } = await supabase
  .from('services')
  .select('*')

console.log('--- SERVICES ---')
console.log(JSON.stringify(data, null, 2))

console.log('\n--- ERROR ---')
console.log(error)
