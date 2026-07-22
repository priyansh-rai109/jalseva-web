'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types'

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications(data || [])
  }

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10))
        }

      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const unread = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button className="relative w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 bg-card border-border shadow-xl" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-sky-400 hover:text-sky-300">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No notifications
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/50 transition-colors ${
                  !n.is_read ? 'bg-sky-500/3' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />}
                  <div className={!n.is_read ? '' : 'pl-3.5'}>
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">{formatDateTime(n.created_at)}</p>
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
