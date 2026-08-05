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
import Link from 'next/link'

const STATUS_OPTIONS = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

export default function SupplierOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/supplier/orders?status=${statusFilter}`)
      const json = await res.json()
      if (res.ok) {
        setOrders(json.orders || [])
      }
    } catch (err) {
      console.error('Error fetching supplier orders:', err)
    }
    setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const res = await fetch('/api/supplier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(`Order marked as ${newStatus.replace('_', ' ')}`)
        fetchOrders()
      } else {
        toast.error(json.error || 'Failed to update order')
      }
    } catch (err) {
      console.error('Error updating order:', err)
      toast.error('Failed to update order')
    }
    setUpdatingId(null)
  }

  const nextStatus: Record<string, { label: string; status: string; color: string }> = {
    pending: { label: 'Confirm Order', status: 'confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    confirmed: { label: 'Out for Delivery', status: 'out_for_delivery', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    out_for_delivery: { label: 'Mark Delivered', status: 'delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  }

  const productTypeIcons: Record<string, string> = { tanker: '🚛', can: '🫙', pouch: '💧' }

  return (
    <div className="space-y-6">
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
          {orders.map((order) => {
            const isPending = order.status === 'pending'
            return (
              <Card
                key={order.id}
                className={`glass-card transition-all ${
                  isPending
                    ? 'border-amber-500/70 bg-amber-500/5 shadow-lg shadow-amber-500/15 animate-pulse'
                    : 'hover:border-sky-500/20'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{productTypeIcons[order.water_products?.type] || '💧'}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{order.water_products?.name}</p>
                            {isPending && (
                              <Badge className="bg-amber-500 text-black font-extrabold text-[10px] animate-pulse px-2 py-0.5 border-none">
                                NEW ORDER ⚡
                              </Badge>
                            )}
                          </div>
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

                    <div className="mt-3">
                      <Link href={`/supplier/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Summary & Details →
                        </Button>
                      </Link>
                    </div>
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
          )})}
        </div>
      )}
    </div>
  )
}
