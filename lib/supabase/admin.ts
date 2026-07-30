import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://uscckewpljmlhiakepic.supabase.co'
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzY2NrZXdwbGptbGhpYWtlcGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDcwNDYzMSwiZXhwIjoyMTAwMjgwNjMxfQ.uWmAe4RvTpza9PS46Tjdb5b_5VClRil-4hJ7GuaopCQ'

function cleanStr(val: string | undefined, fallback: string): string {
  if (!val) return fallback
  const cleaned = val.replace(/['"]/g, '').trim()
  return cleaned !== '' ? cleaned : fallback
}

export function createAdminClient() {
  const supabaseUrl = cleanStr(process.env.NEXT_PUBLIC_SUPABASE_URL, DEFAULT_SUPABASE_URL)
  const serviceRoleKey = cleanStr(process.env.SUPABASE_SERVICE_ROLE_KEY, DEFAULT_SERVICE_ROLE_KEY)

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
