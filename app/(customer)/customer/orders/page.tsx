import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  ShoppingCart, Clock, CheckCircle2, Truck, XCircle, ArrowUpRight, Droplets
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'My Orders' }

export default async function CustomerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customer } = await supabase.from('customers').select('id').eq('user_id', user.id).single()

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, total_amount, status, quantity, payment_mode, created_at, delivered_at,
      suppliers(business_name, phone),
      water_products(name, type, capacity_liters)
    `)
    .eq('customer_id', customer?.id)
    .order('created_at', { ascending: false })

  const statusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-400" />
    if (status === 'confirmed') return <CheckCircle2 className="w-4 h-4 text-blue-400" />
    if (status === 'out_for_delivery') return <Truck className="w-4 h-4 text-purple-400" />
    if (status === 'delivered') return <CheckCircle2 className="w-4 h-4 text-green-400" />
    if (status === 'cancelled') return <XCircle className="w-4 h-4 text-red-400" />
    return null
  }

  const productTypeIcon = (type: string) => {
    if (type === 'tanker') return '🚛'
    if (type === 'can') return '🫙'
    return '💧'
  }

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
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="glass-card hover:border-sky-500/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{productTypeIcon((order.water_products as any)?.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold">{(order.water_products as any)?.name}</h3>
                      <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{(order.suppliers as any)?.business_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>Qty: {order.quantity}</span>
                      <span>Payment: {order.payment_mode.replace('_', ' ')}</span>
                      <span>{formatDateTime(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground justify-end">
                      {statusIcon(order.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
