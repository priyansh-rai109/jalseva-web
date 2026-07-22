'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, CheckCheck, Droplets, ShoppingCart, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
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

export default function NotificationsPage() {
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

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => fetchNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="glass-card h-20 animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <BellOff className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">Order updates and platform news will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                n.is_read
                  ? 'glass-card opacity-60 hover:opacity-80'
                  : 'glass-card border-sky-500/20 bg-sky-500/3 hover:border-sky-500/40'
              }`}
            >
              <div className={`w-9 h-9 rounded-full ${typeBg(n.type)} flex items-center justify-center flex-shrink-0`}>
                {typeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground/50 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
