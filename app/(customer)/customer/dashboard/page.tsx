import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatDisplayName } from '@/lib/utils'
import { CustomerDashboardClient } from './CustomerDashboardClient'

export const metadata = { title: 'My Dashboard' }
export const dynamic = 'force-dynamic'

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()
  const phoneToUse = user.phone || user.user_metadata?.phone

  let customerObj: any = null

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const { data: byUser } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byUser) {
    customerObj = byUser
  } else if (phoneToUse) {
    const digits = phoneToUse.slice(-10)
    const { data: byPhone } = await adminSupabase
      .from('customers')
      .select('*')
      .ilike('phone', `%${digits}%`)
      .maybeSingle()
    if (byPhone) customerObj = byPhone
  }

  const customerId = customerObj?.id

  const [
    { data: activeOrders },
    { data: recentOrders },
    { data: deliveredOrdersList },
    { count: totalOrders },
    { count: deliveredOrders },
    { data: suppliers }
  ] = await Promise.all([
    customerId ? adminSupabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        suppliers(business_name),
        water_products(name, type)
      `)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'confirmed', 'out_for_delivery'])
      .order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),

    customerId ? adminSupabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        suppliers(business_name),
        water_products(name, type)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5) : Promise.resolve({ data: [] }),

    customerId ? adminSupabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, created_at,
        suppliers(id, business_name),
        water_products(name, type),
        reviews(id, rating)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(3) : Promise.resolve({ data: [] }),

    customerId ? adminSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId) : Promise.resolve({ count: 0 }),

    customerId ? adminSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'delivered') : Promise.resolve({ count: 0 }),

    adminSupabase
      .from('suppliers')
      .select('*, zones(name)')
      .eq('status', 'approved')
      .order('rating', { ascending: false })
      .limit(4)
  ])

  // Find any delivered order that hasn't received a review yet
  const unreviewedOrder = (deliveredOrdersList || []).find((ord: any) => {
    if (!ord.reviews) return true
    if (Array.isArray(ord.reviews) && ord.reviews.length === 0) return true
    return false
  })

  const displayName = formatDisplayName(
    customerObj?.name || profile?.name || user.user_metadata?.name,
    user.phone || user.user_metadata?.phone
  )

  return (
    <CustomerDashboardClient
      displayName={displayName}
      unreviewedOrder={unreviewedOrder}
      totalOrders={totalOrders ?? 0}
      deliveredOrders={deliveredOrders ?? 0}
      activeOrders={activeOrders || []}
      recentOrders={recentOrders || []}
      suppliers={suppliers || []}
    />
  )
}
