import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/Sidebar'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') redirect('/login')

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role="customer"
        userName={profile.name || 'Customer'}
        userEmail={profile.email || ''}
        notificationCount={count || 0}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
