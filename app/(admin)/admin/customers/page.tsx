import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Phone, Mail, ShoppingCart, Calendar, Droplets } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, getInitials } from '@/lib/utils'

export const metadata = { title: 'Customers — Admin' }

export default async function AdminCustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin-login')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  // Get order counts per customer
  const customerIds = customers?.map((c: any) => c.id) || []

  const { data: orderCounts } = await supabase
    .from('orders')
    .select('customer_id')
    .in('customer_id', customerIds)

  const countMap: Record<string, number> = {}
  orderCounts?.forEach((o: any) => {
    countMap[o.customer_id] = (countMap[o.customer_id] || 0) + 1
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">{customers?.length || 0} registered customers</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-sky-400" />
        </div>
      </div>

      {!customers || customers.length === 0 ? (
        <div className="text-center py-20">
          <Droplets className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">No customers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer: any) => (
            <Card key={customer.id} className="glass-card hover:border-sky-500/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full water-shimmer flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(customer.name || 'C')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email || 'No email'}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {customer.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {customer.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="w-3 h-3" /> {countMap[customer.id] || 0} orders
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Joined {formatDate(customer.created_at)}
                  </div>
                  {customer.addresses?.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> {customer.addresses.length} saved address{customer.addresses.length > 1 ? 'es' : ''}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
