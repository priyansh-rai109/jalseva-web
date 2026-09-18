import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'
import { Sidebar } from '@/components/shared/Sidebar'
import { formatDisplayName, isPlaceholderName, resolveRealName } from '@/lib/utils'

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware already guards this route — if we get here, user is authenticated.
  // Only redirect to /register/complete-profile (not /login!) if truly no session.
  if (!user) redirect('/register/complete-profile')

  const adminSupabase = createAdminClient()
  const emailDigits = user.email ? (user.email.match(/\d{10}/)?.[0] || '') : ''
  const rawPhone = user.phone || user.user_metadata?.phone || emailDigits
  let digits = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : ''
  let phoneToUse = digits ? `+91${digits}` : rawPhone

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  let profileObj = profile
  if (!profileObj && digits) {
    const { data: pByPhone } = await adminSupabase
      .from('profiles')
      .select('*')
      .or(`phone.eq.+91${digits},phone.eq.${digits},phone.eq.91${digits},phone.ilike.%${digits}%`)
      .maybeSingle()
    if (pByPhone) profileObj = pByPhone
  }

  if (profileObj?.phone && !digits) {
    digits = profileObj.phone.replace(/\D/g, '').slice(-10)
    phoneToUse = `+91${digits}`
  }

  // If profile has a different role, redirect to complete-profile (not /login — avoids loop)
  if (profileObj && profileObj.role && profileObj.role !== 'supplier') {
    redirect('/register/complete-profile')
  }

  const supplier = await getSupplierForUser(user)

  let authUserMetaName: string | null = null
  if (user.id && !user.id.startsWith('00000000-0000-')) {
    try {
      const { data: aUser } = await adminSupabase.auth.admin.getUserById(user.id)
      authUserMetaName = aUser?.user?.user_metadata?.name || aUser?.user?.user_metadata?.full_name || null
    } catch {}
  }

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

  const realRegisteredName = resolveRealName([
    supplier?.business_name,
    supplier?.owner_name,
    profileObj?.name,
    (user as any).user_metadata?.name,
    (user as any).user_metadata?.full_name,
    authUserMetaName,
  ])

  // Auto-heal database records if real registered name was found
  if (realRegisteredName) {
    if (supplier?.id && isPlaceholderName(supplier.business_name)) {
      adminSupabase.from('suppliers').update({ business_name: realRegisteredName }).eq('id', supplier.id).then(() => {})
    }
    if (profileObj?.id && isPlaceholderName(profileObj.name)) {
      adminSupabase.from('profiles').update({ name: realRegisteredName }).eq('id', profileObj.id).then(() => {})
    }
  }

  // Graceful fallback: use real registered name
  const displayName = formatDisplayName(
    realRegisteredName || supplier?.business_name || supplier?.owner_name || profileObj?.name,
    null,
    'supplier'
  )
  const rawEmail = profile?.email || supplier?.email || (user as any).email || ''
  const isDummyEmail = !rawEmail || rawEmail.startsWith('user_91') || rawEmail.startsWith('test_91') || rawEmail.endsWith('@jalseva.app') || rawEmail.endsWith('@jalseva.demo')
  const formattedPhone = digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : ''
  const displayEmail = (isDummyEmail && formattedPhone) ? formattedPhone : rawEmail

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
