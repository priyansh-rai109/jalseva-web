import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/shared/Sidebar'
import { formatDisplayName } from '@/lib/utils'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/register/complete-profile')

  const adminSupabase = createAdminClient()
  const phoneToUse = user.phone || user.user_metadata?.phone

  let profileObj: any = null
  let customerObj: any = null

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  profileObj = profile

  const { data: byUser } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byUser) {
    customerObj = byUser
  } else if (phoneToUse) {
    const digits = phoneToUse.replace(/\D/g, '').slice(-10)
    if (digits) {
      const { data: byPhone } = await adminSupabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${digits}%`)
        .maybeSingle()
      if (byPhone) customerObj = byPhone
    }
  }

  if (profileObj && profileObj.role && profileObj.role !== 'customer') {
    redirect('/register/complete-profile')
  }

  let notifCount = 0
  try {
    const { count } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    notifCount = count || 0
  } catch {}

  const displayName = formatDisplayName(
    customerObj?.name || profileObj?.name || (user as any).user_metadata?.name,
    user.phone || (user as any).user_metadata?.phone
  )
  const displayEmail = customerObj?.email || profileObj?.email || (user as any).email || ''

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar
        role="customer"
        userName={displayName}
        userEmail={displayEmail}
        notificationCount={notifCount}
      />
      <main className="flex-1 overflow-x-hidden min-w-0 p-4 md:p-6 lg:p-8 animate-in fade-in-50 duration-200">
        {children}
      </main>
    </div>
  )
}
