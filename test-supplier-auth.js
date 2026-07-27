import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

async function testSupplierAuth() {
  // 1. Get the user for sunshine water supplier
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const supplierUser = users.users.find(u => u.phone === '917976042558')
  console.log('Supplier user:', supplierUser ? supplierUser.id : 'NOT FOUND')

  // We can't easily sign in with OTP without receiving the OTP, but we can generate a magic link or use service role to act as the user.
  // Actually, we can use supabase Client but passing the user's JWT or just test RLS via admin client by explicitly setting the role/auth.uid
  
  // Create a client authenticated as the supplier user
  // This is a trick to test RLS without full auth
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: supplierUser.email || 'test@test.com' // Wait, they logged in with phone.
  })
}

testSupplierAuth()
