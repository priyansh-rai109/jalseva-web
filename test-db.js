import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  console.log('Auth users count:', users.users.length)
  console.dir(users.users.map(u => ({ id: u.id, email: u.email, phone: u.phone })), { depth: null })

  const { data: customers } = await supabaseAdmin.from('customers').select('*')
  console.log('Customers count:', customers.length)

  const { data: suppliers } = await supabaseAdmin.from('suppliers').select('*')
  console.log('Suppliers count:', suppliers.length)
  console.dir(suppliers, { depth: null })

  const { data: orders } = await supabaseAdmin.from('orders').select('*')
  console.log('Orders count:', orders.length)
  console.dir(orders, { depth: null })
}

check()
