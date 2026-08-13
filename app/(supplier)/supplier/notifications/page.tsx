'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, ShoppingCart, Settings, ArrowRight, BellOff } from 'lucide-react'
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

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (res.ok && json.notifications) {
        setNotifications(json.notifications)
      }
    } catch (err) {
      console.warn('Error fetching supplier notifications:', err)
    }
    if (showLoader) setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotifications(true)

    // Polling fallback every 7 seconds
    const interval = setInterval(() => {
      fetchNotifications(false)
    }, 7000)

    // Realtime subscription for incoming notifications & orders
    const channel = supabase
      .channel('supplier-notifications-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchNotifications(false)
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase])

  const markAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (res.ok) {
        toast.success('All notifications marked as read')
      }
    } catch (e) {
      toast.error('Failed to mark notifications as read')
    }
  }

  const markRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {}
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
              <Badge className="bg-sky-500 text-white text-xs font-bold">{unreadCount} New</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Real-time alerts for customer orders, confirmations, and updates</p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-24 rounded-xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl">
          <BellOff className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold">No Notifications Yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Incoming customer orders, cancellations, and status alerts will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`glass-card transition-all rounded-xl cursor-pointer ${
                !n.is_read
                  ? 'border-sky-500/40 bg-sky-500/5 shadow-md shadow-sky-500/5 hover:border-sky-500/60'
                  : 'hover:border-border opacity-75 hover:opacity-100'
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
                        <p className={`text-sm font-semibold ${!n.is_read ? 'text-sky-400 font-bold' : 'text-foreground'}`}>
                          {n.title}
                        </p>
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
                      <div className="mt-3 pt-2 border-t border-border/40 flex justify-end">
                        <Link
                          href={`/supplier/orders/${n.reference_id}`}
                          className="text-sky-400 hover:underline text-xs font-semibold flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Order Summary <ArrowRight className="w-3 h-3" />
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
