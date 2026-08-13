import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function resolveUserCandidateIds(user: any) {
  if (!user || !user.id) return []

  const ids = new Set<string>()
  ids.add(user.id)

  const rawPhone = user.phone || user.user_metadata?.phone || ''
  const digits = rawPhone.replace(/\D/g, '').slice(-10)
  if (digits) {
    ids.add(getPhoneUuid(digits))
  }

  const admin = createAdminClient()

  // 1. Check customer table
  try {
    const { data: customers } = await admin
      .from('customers')
      .select('id, user_id')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)

    if (customers) {
      customers.forEach((c: any) => {
        if (c.id) ids.add(c.id)
        if (c.user_id) ids.add(c.user_id)
      })
    }
  } catch {}

  // 2. Check supplier table
  try {
    const { data: suppliers } = await admin
      .from('suppliers')
      .select('id, user_id')
      .or(`user_id.eq.${user.id},id.eq.${user.id}`)

    if (suppliers) {
      suppliers.forEach((s: any) => {
        if (s.id) ids.add(s.id)
        if (s.user_id) ids.add(s.user_id)
      })
    }
  } catch {}

  return Array.from(ids)
}

// GET: Fetch all notifications for the current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const candidateIds = await resolveUserCandidateIds(user)
    const admin = createAdminClient()

    const query = admin
      .from('notifications')
      .select('*')
      .in('user_id', candidateIds)
      .order('created_at', { ascending: false })
      .limit(40)

    const { data: notifications, error } = await query

    if (error) {
      console.error('[Notifications GET Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notifs = notifications || []
    const unreadCount = notifs.filter((n: any) => !n.is_read).length

    return NextResponse.json({
      success: true,
      notifications: notifs,
      unreadCount,
    })
  } catch (err: any) {
    console.error('[Notifications GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, markAllRead } = body

    const candidateIds = await resolveUserCandidateIds(user)
    const admin = createAdminClient()

    if (markAllRead) {
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .in('user_id', candidateIds)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (id) {
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Notification marked as read' })
    }

    return NextResponse.json({ error: 'Missing id or markAllRead' }, { status: 400 })
  } catch (err: any) {
    console.error('[Notifications PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
