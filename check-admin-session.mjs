import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = fs.readFileSync('.env', 'utf8')

const getEnv = (name) => {
  const match = env.match(
    new RegExp(`^${name}=(.*)$`, 'm')
  )
  return match?.[1]?.trim()
}

const url = getEnv('VITE_SUPABASE_URL')
const key = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY')

const supabase = createClient(url, key)

const { data, error } =
  await supabase.auth.getSession()

console.log('--- SESSION ---')
console.log(JSON.stringify(data, null, 2))

console.log('\n--- ERROR ---')
console.log(error)
