'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ShoppingCart, Clock, CheckCircle2, Truck, XCircle,
  ArrowUpRight, Droplets, Search, Filter
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils'

const STATUS_OPTIONS = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

export default function SupplierOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: supplier } = await supabase.from('suppliers').select('id').eq('user_id', user.id).single()
      if (supplier) { setSupplierId(supplier.id); fetchOrders(supplier.id) }
    }
    init()
  }, [])

  const fetchOrders = async (sid: string) => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select(`
        id, total_amount, status, quantity, payment_mode, delivery_address, created_at, special_instructions,
        customers(name, phone),
        water_products(name, type, capacity_liters)
      `)
      .eq('supplier_id', sid)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { if (supplierId) fetchOrders(supplierId) }, [statusFilter, supplierId])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { toast.error('Failed to update'); setUpdatingId(null); return }
    toast.success(`Order marked as ${newStatus.replace('_', ' ')}`)
    setUpdatingId(null)
    fetchOrders(supplierId!)
  }

  const nextStatus: Record<string, { label: string; status: string; color: string }> = {
    pending: { label: 'Confirm Order', status: 'confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    confirmed: { label: 'Out for Delivery', status: 'out_for_delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    out_for_delivery: { label: 'Mark Delivered', status: 'delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  }

  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and fulfill customer orders</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', ...STATUS_OPTIONS]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
              statusFilter === s ? 'bg-sky-500 text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="glass-card h-28 animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Droplets className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="glass-card hover:border-sky-500/20 transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{productTypeIcons[order.water_products?.type] || '💧'}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">{order.water_products?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Customer: {order.customers?.name}
                          {order.customers?.phone && ` · ${order.customers.phone}`}
                        </p>
                      </div>
                      <Badge className={`text-xs border ${getOrderStatusColor(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <span>Qty: {order.quantity}</span>
                      <span>Payment: {order.payment_mode?.replace('_', ' ')}</span>
                      <span className="col-span-2">{formatDateTime(order.created_at)}</span>
                    </div>

                    {order.delivery_address && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {typeof order.delivery_address === 'object'
                          ? `${order.delivery_address.line1}, ${order.delivery_address.city}`
                          : order.delivery_address}
                      </p>
                    )}

                    {order.special_instructions && (
                      <p className="text-xs text-amber-400 mt-1">📝 {order.special_instructions}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                    {nextStatus[order.status] && (
                      <Button
                        size="sm"
                        disabled={updatingId === order.id}
                        onClick={() => updateOrderStatus(order.id, nextStatus[order.status].status)}
                        className={`mt-2 text-xs border ${nextStatus[order.status].color} hover:opacity-80`}
                      >
                        {updatingId === order.id ? '...' : nextStatus[order.status].label}
                      </Button>
                    )}
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        disabled={updatingId === order.id}
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="mt-1 text-xs border bg-red-500/10 text-red-400 border-red-500/20 hover:opacity-80 ml-1"
                      >
                        Cancel
                      </Button>
                    )}
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
