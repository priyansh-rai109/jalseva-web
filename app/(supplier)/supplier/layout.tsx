import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/Sidebar'

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already guards this route — if we get here, user is authenticated.
  // Only redirect to /register/complete-profile (not /login!) if truly no session.
  if (!user) redirect('/register/complete-profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // If profile has a different role, redirect to complete-profile (not /login — avoids loop)
  if (profile && profile.role && profile.role !== 'supplier') {
    redirect('/register/complete-profile')
  }

  let notifCount = 0
  try {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    notifCount = count || 0
  } catch {}

  // Graceful fallback: use mock session name/email if profile is null
  const displayName = profile?.name || (user as any).user_metadata?.name || 'Supplier'
  const displayEmail = profile?.email || (user as any).email || ''

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar
        role="supplier"
        userName={displayName}
        userEmail={displayEmail}
        notificationCount={notifCount}
      />
      <main className="flex-1 overflow-x-hidden min-w-0 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
