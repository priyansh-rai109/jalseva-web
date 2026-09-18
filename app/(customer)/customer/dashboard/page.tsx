import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { formatDisplayName, isPlaceholderName, resolveRealName } from '@/lib/utils'
import { CustomerDashboardClient } from './CustomerDashboardClient'

export const metadata = { title: 'My Dashboard' }
export const dynamic = 'force-dynamic'

export default async function CustomerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()
  const emailDigits = user.email ? (user.email.match(/\d{10}/)?.[0] || '') : ''
  const rawPhone = user.phone || user.user_metadata?.phone || emailDigits
  let digits = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : ''
  let phoneToUse = digits ? `+91${digits}` : rawPhone

  // 1. Fetch Profile by ID or by Phone
  let { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile && digits) {
    const { data: pByPhone } = await adminSupabase
      .from('profiles')
      .select('*')
      .or(`phone.eq.+91${digits},phone.eq.${digits},phone.ilike.%${digits}%`)
      .maybeSingle()
    if (pByPhone) profile = pByPhone
  }

  if (profile?.phone && !digits) {
    digits = profile.phone.replace(/\D/g, '').slice(-10)
    phoneToUse = `+91${digits}`
  }

  // 2. Fetch Customer record by user_id, profile id, or phone
  let customerObj: any = null

  const { data: byUser } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byUser) {
    customerObj = byUser
  } else if (profile?.id) {
    const { data: byProfId } = await adminSupabase
      .from('customers')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle()
    if (byProfId) customerObj = byProfId
  }

  if (!customerObj && digits) {
    const { data: byPhone } = await adminSupabase
      .from('customers')
      .select('*')
      .or(`phone.eq.+91${digits},phone.eq.${digits},phone.ilike.%${digits}%`)
      .maybeSingle()
    if (byPhone) customerObj = byPhone
  }

  // 3. Resolve Real Registered Name (filtering out 'Customer' or placeholder names)
  let authAdminName: string | null = null
  if (user.id && !user.id.startsWith('00000000-0000-')) {
    try {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(user.id)
      authAdminName = authUser?.user?.user_metadata?.name || authUser?.user?.user_metadata?.full_name || null
    } catch {}
  }

  const nameCandidates = [
    customerObj?.name,
    profile?.name,
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    authAdminName,
    (user as any).name,
  ]

  const realRegisteredName = resolveRealName(nameCandidates)

  // Auto-create customer row if missing (e.g., registered user without customer entry)
  if (!customerObj && (profile || digits || user.id)) {
    const custName = realRegisteredName || profile?.name || user.user_metadata?.name || 'Customer'
    const custPhone = profile?.phone || phoneToUse || (digits ? `+91${digits}` : null)
    const custUserId = profile?.id || user.id
    try {
      const { data: newCust } = await adminSupabase
        .from('customers')
        .insert({
          user_id: custUserId,
          name: custName,
          phone: custPhone,
          email: profile?.email || (user as any).email || undefined,
          addresses: [{ id: 'default-addr', city: 'Jodhpur', label: 'Primary', line1: 'Jodhpur, Rajasthan', is_default: true }]
        })
        .select()
        .maybeSingle()
      if (newCust) {
        customerObj = newCust
      }
    } catch (e) {
      console.warn('Auto-create customer error:', e)
    }
  }

  // Auto-heal database records if they still had placeholder 'Customer'
  if (realRegisteredName) {
    if (customerObj?.id && isPlaceholderName(customerObj.name)) {
      adminSupabase.from('customers').update({ name: realRegisteredName }).eq('id', customerObj.id).then(() => {})
      customerObj.name = realRegisteredName
    }
    if (profile?.id && isPlaceholderName(profile.name)) {
      adminSupabase.from('profiles').update({ name: realRegisteredName }).eq('id', profile.id).then(() => {})
      profile.name = realRegisteredName
    }
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
    realRegisteredName || customerObj?.name || profile?.name || user.user_metadata?.name,
    null,
    'customer'
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
