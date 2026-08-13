'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, ShoppingCart, Info, CheckCircle2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import type { Notification } from '@/types'

export function NotificationBell({ userId }: { userId?: string }) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      if (res.ok && json.notifications) {
        setNotifications(json.notifications)
        setUnreadCount(json.unreadCount ?? json.notifications.filter((n: any) => !n.is_read).length)
      }
    } catch (err) {
      console.warn('Error fetching notifications in bell:', err)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    // 1. Polling interval (every 8 seconds) as reliable sync
    const interval = setInterval(() => {
      fetchNotifications()
    }, 8000)

    // 2. Realtime subscription on notifications & orders table
    const channel = supabase
      .channel(`global-notifications-feed`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchNotifications()
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
      setUnreadCount(0)
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
    } catch (e) {
      console.warn('Failed to mark notifications read:', e)
    }
  }

  const getNotifIcon = (type: string) => {
    if (type === 'order') return <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
    return <Info className="w-3.5 h-3.5 text-amber-400" />
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-lg bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors border border-border/50"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0 bg-card border-border shadow-2xl rounded-xl overflow-hidden" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold">
                {unreadCount} New
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-25" />
              <p>No notifications yet</p>
              <p className="text-xs text-muted-foreground/60">New orders & status alerts will appear here</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 transition-colors ${
                  !n.is_read ? 'bg-sky-500/5 hover:bg-sky-500/10' : 'hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-secondary flex-shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold ${!n.is_read ? 'text-sky-400 font-bold' : 'text-foreground'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground/60">
                      <span>{formatDateTime(n.created_at)}</span>
                      {n.reference_id && (
                        <Link
                          href={`/customer/orders/${n.reference_id}`}
                          onClick={() => setOpen(false)}
                          className="text-sky-400 hover:underline font-medium"
                        >
                          View Order →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
