'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, Droplets, ShoppingCart, Settings, ArrowRight, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Notification } from '@/types'

const typeIcon = (type: string) => {
  if (type === 'order') return <ShoppingCart className="w-4 h-4 text-sky-400" />
  if (type === 'promo') return <Bell className="w-4 h-4 text-amber-400" />
  return <Settings className="w-4 h-4 text-muted-foreground" />
}

const typeBg = (type: string) => {
  if (type === 'order') return 'bg-sky-500/10'
  if (type === 'promo') return 'bg-amber-500/10'
  return 'bg-secondary'
}

export default function SupplierNotificationsPage() {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription for incoming notifications
    const channel = supabase
      .channel('supplier-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    if (error) {
      toast.error('Failed to mark notifications as read')
      return
    }
    toast.success('All notifications marked as read')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-sky-500 text-white text-xs">{unreadCount} New</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Real-time alerts for customer orders, confirmations, and updates</p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs">
            <CheckCheck className="w-4 h-4 mr-1.5 text-sky-400" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-20 rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-3" />
          <p className="text-lg font-semibold">No Notifications Yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Order updates, customer confirmations, and delivery alerts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`glass-card transition-all rounded-xl ${
                !n.is_read ? 'border-sky-500/40 bg-sky-500/5 shadow-md shadow-sky-500/5' : 'hover:border-border'
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${typeBg(n.type)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>

                    {n.reference_id && (
                      <div className="mt-3">
                        <Link href={`/supplier/orders/${n.reference_id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5">
                            View Order Summary <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
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
