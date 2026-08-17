import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Droplets } from 'lucide-react'
import Link from 'next/link'
import { CustomerOrdersClient } from './CustomerOrdersClient'

export const metadata = { title: 'My Orders' }
export const dynamic = 'force-dynamic'

export default async function CustomerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()
  const phoneToUse = user.phone || user.user_metadata?.phone

  let customerId: string | null = null

  // 1. Resolve customer by user_id
  const { data: byUser } = await adminSupabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byUser?.id) {
    customerId = byUser.id
  } else if (phoneToUse) {
    const digits = phoneToUse.slice(-10)
    const { data: byPhone } = await adminSupabase
      .from('customers')
      .select('id')
      .ilike('phone', `%${digits}%`)
      .maybeSingle()
    if (byPhone?.id) customerId = byPhone.id
  }

  const { data: orders } = customerId ? await adminSupabase
    .from('orders')
    .select(`
      id, total_amount, status, quantity, payment_mode, created_at, delivered_at,
      suppliers(id, business_name, phone),
      water_products(name, type, capacity_liters),
      reviews(id, rating, comment)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false }) : { data: [] }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>My Orders</h1>
        <p className="text-muted-foreground mt-1">Track all your water orders</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-20">
          <Droplets className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No orders yet</p>
          <Link href="/customer/browse" className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300">
            Browse suppliers to place your first order →
          </Link>
        </div>
      ) : (
        <CustomerOrdersClient initialOrders={orders} />
      )}
    </div>
  )
}
