import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/shared/Sidebar'
import { formatDisplayName, isPlaceholderName, resolveRealName } from '@/lib/utils'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/register/complete-profile')

  const adminSupabase = createAdminClient()
  const emailDigits = user.email ? (user.email.match(/\d{10}/)?.[0] || '') : ''
  const rawPhone = user.phone || user.user_metadata?.phone || emailDigits
  let digits = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : ''
  let phoneToUse = digits ? `+91${digits}` : rawPhone

  let profileObj: any = null
  let customerObj: any = null

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  profileObj = profile
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

  const { data: byUser } = await adminSupabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byUser) {
    customerObj = byUser
  } else if (profileObj?.id) {
    const { data: byProfId } = await adminSupabase
      .from('customers')
      .select('*')
      .eq('user_id', profileObj.id)
      .maybeSingle()
    if (byProfId) customerObj = byProfId
  }

  if (!customerObj && digits) {
    const { data: byPhone } = await adminSupabase
      .from('customers')
      .select('*')
      .or(`phone.eq.+91${digits},phone.eq.${digits},phone.eq.91${digits},phone.ilike.%${digits}%`)
      .maybeSingle()
    if (byPhone) customerObj = byPhone
  }

  if (profileObj && profileObj.role && profileObj.role !== 'customer') {
    redirect('/register/complete-profile')
  }

  let authUserMetaName: string | null = null
  if (user.id && !user.id.startsWith('00000000-0000-')) {
    try {
      const { data: aUser } = await adminSupabase.auth.admin.getUserById(user.id)
      authUserMetaName = aUser?.user?.user_metadata?.name || aUser?.user?.user_metadata?.full_name || null
    } catch {}
  }

  let notifCount = 0
  try {
    const candidateIds = Array.from(new Set([user.id, customerObj?.id, customerObj?.user_id].filter(Boolean)))
    const { count } = await adminSupabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('user_id', candidateIds)
      .eq('is_read', false)
    notifCount = count || 0
  } catch {}

  const realRegisteredName = resolveRealName([
    customerObj?.name,
    profileObj?.name,
    (user as any).user_metadata?.name,
    (user as any).user_metadata?.full_name,
    authUserMetaName,
    (user as any).name,
  ])

  // Auto-heal database records if real registered name was found
  if (realRegisteredName) {
    if (customerObj?.id && isPlaceholderName(customerObj.name)) {
      adminSupabase.from('customers').update({ name: realRegisteredName }).eq('id', customerObj.id).then(() => {})
    }
    if (profileObj?.id && isPlaceholderName(profileObj.name)) {
      adminSupabase.from('profiles').update({ name: realRegisteredName }).eq('id', profileObj.id).then(() => {})
    }
  }

  if (!customerObj && (profileObj || digits || user.id)) {
    const custName = realRegisteredName || profileObj?.name || (user as any).user_metadata?.name || 'Customer'
    const custPhone = profileObj?.phone || phoneToUse || (digits ? `+91${digits}` : null)
    const custUserId = profileObj?.id || user.id
    try {
      adminSupabase
        .from('customers')
        .insert({
          user_id: custUserId,
          name: custName,
          phone: custPhone,
          email: profileObj?.email || (user as any).email || undefined,
          addresses: [{ id: 'default-addr', city: 'Jodhpur', label: 'Primary', line1: 'Jodhpur, Rajasthan', is_default: true }]
        })
        .select()
        .maybeSingle()
        .then(({ data }: any) => { if (data) customerObj = data })
    } catch {}
  }

  const displayName = formatDisplayName(
    realRegisteredName || customerObj?.name || profileObj?.name || (user as any).user_metadata?.name,
    null,
    'customer'
  )
  const rawEmail = customerObj?.email || profileObj?.email || (user as any).email || ''
  const isDummyEmail = !rawEmail || rawEmail.startsWith('user_91') || rawEmail.startsWith('test_91') || rawEmail.endsWith('@jalseva.app') || rawEmail.endsWith('@jalseva.demo')
  const formattedPhone = digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : ''
  const displayEmail = (isDummyEmail && formattedPhone) ? formattedPhone : rawEmail

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar
        role="customer"
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
