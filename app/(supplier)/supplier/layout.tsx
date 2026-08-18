import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'
import { Sidebar } from '@/components/shared/Sidebar'

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already guards this route — if we get here, user is authenticated.
  // Only redirect to /register/complete-profile (not /login!) if truly no session.
  if (!user) redirect('/register/complete-profile')

  const adminSupabase = createAdminClient()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // If profile has a different role, redirect to complete-profile (not /login — avoids loop)
  if (profile && profile.role && profile.role !== 'supplier') {
    redirect('/register/complete-profile')
  }

  const supplier = await getSupplierForUser(user)

  let notifCount = 0
  try {
    const candidateIds = Array.from(new Set([user.id, supplier?.id, supplier?.user_id].filter(Boolean)))
    const { count } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('user_id', candidateIds)
      .eq('is_read', false)
    notifCount = count || 0
  } catch {}

  // Graceful fallback: use mock session name/email if profile is null
  const displayName = profile?.name || supplier?.business_name || (user as any).user_metadata?.name || 'Supplier'
  const displayEmail = profile?.email || supplier?.email || (user as any).email || ''

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar
        role="supplier"
        userName={displayName}
        userEmail={displayEmail}
        notificationCount={notifCount}
      />
      <main className="flex-1 overflow-x-hidden min-w-0 p-3 sm:p-5 md:p-6 lg:p-8 pb-24 lg:pb-8 animate-in fade-in-50 duration-200">
        {children}
      </main>
    </div>
  )
}
