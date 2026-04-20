import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserProfile = {
  wallet_address: string
  name: string
  x_username: string | null
  telegram_handle: string | null
  whatsapp: string | null
  country_code: string | null
  registered_at: string
}
