import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AnalyticsDashboardClient from './AnalyticsDashboardClient'

export const metadata = { title: 'Analytics — Admin' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const adminSupabase = createAdminClient()

  // Fetch all orders and suppliers with admin privilege to avoid RLS restrictions
  const [
    { data: allOrders },
    { data: allSuppliers },
    { count: totalSuppliers },
    { count: totalCustomers },
    { count: approvedSuppliers },
  ] = await Promise.all([
    adminSupabase
      .from('orders')
      .select('id, status, total_amount, quantity, payment_mode, payment_status, created_at, customer_id, supplier_id')
      .order('created_at', { ascending: true }),
    adminSupabase
      .from('suppliers')
      .select('id, user_id, business_name, owner_name, status, rating, total_orders')
      .order('rating', { ascending: false }),
    adminSupabase.from('suppliers').select('*', { count: 'exact', head: true }),
    adminSupabase.from('customers').select('*', { count: 'exact', head: true }),
    adminSupabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  const orders = allOrders || []
  const suppliers = allSuppliers || []

  return (
    <div className="p-3 sm:p-5 md:p-8 max-w-7xl mx-auto">
      <AnalyticsDashboardClient
        orders={orders as any}
        suppliers={suppliers as any}
        totalSuppliers={totalSuppliers ?? 0}
        approvedSuppliers={approvedSuppliers ?? 0}
        totalCustomers={totalCustomers ?? 0}
      />
    </div>
  )
}
