import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

async function resolveUserId(admin: any, payload: any, role: string, name: string) {
  const digits = payload.phone.replace(/\D/g, '').slice(-10)
  const fullPhone = `+91${digits}`
  const dummyEmail = `test_91${digits}@jalseva.app`
  let realUserId = payload.userId

  // 1. If valid non-fallback UUID provided
  if (realUserId && typeof realUserId === 'string' && !realUserId.startsWith('00000000-0000-')) {
    return realUserId
  }

  // 2. Search profiles table by phone or email
  try {
    const { data: p } = await admin
      .from('profiles')
      .select('id')
      .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
      .maybeSingle()
    if (p?.id) return p.id
  } catch (e) {
    console.warn('[resolveUserId] Profile query exception:', e)
  }

  // 3. Try creating user via Supabase Auth Admin API
  try {
    const { data: newAuth, error: authErr } = await admin.auth.admin.createUser({
      email: dummyEmail,
      password: 'MockUser123!',
      email_confirm: true,
      user_metadata: { role, name, phone: fullPhone }
    })

    if (newAuth?.user?.id) {
      return newAuth.user.id
    }

    if (authErr) {
      console.warn('[resolveUserId] Auth user create error:', authErr.message)
      const { data: usersData } = await admin.auth.admin.listUsers()
      const existingUser = usersData?.users?.find(
        (u: any) => u.email === dummyEmail || u.phone === fullPhone
      )
      if (existingUser?.id) return existingUser.id
    }
  } catch (err) {
    console.warn('[resolveUserId] Auth createUser exception:', err)
  }

  // 4. Fallback: return deterministic phone UUID
  return getPhoneUuid(digits)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      role = 'customer',
      userId: rawUserId,
      phone: rawPhone,
      name,
      bizName,
      ownerName,
      address,
      city = 'Jodhpur',
    } = body

    const digits = (rawPhone ?? '').replace(/\D/g, '').slice(-10)
    const fullPhone = digits ? `+91${digits}` : rawPhone
    const profileName = (role === 'supplier' ? (bizName || name) : name) || 'JalSeva User'
    const dummyEmail = `test_91${digits}@jalseva.app`

    const admin = createAdminClient()
    const realUserId = await resolveUserId(admin, { userId: rawUserId, phone: fullPhone }, role, profileName)

    console.log('[complete-profile API] Upserting profile for:', { realUserId, role, profileName, fullPhone, city })

    // Upsert into profiles
    const { error: pErr } = await admin.from('profiles').upsert({
      id: realUserId,
      role: role,
      name: profileName,
      email: dummyEmail,
      phone: fullPhone,
      updated_at: new Date().toISOString(),
    })
    if (pErr) console.warn('[complete-profile API] profiles upsert warning:', pErr.message)

    if (role === 'supplier') {
      const { error: sErr } = await admin.from('suppliers').upsert({
        user_id: realUserId,
        business_name: bizName || profileName,
        owner_name: ownerName || profileName,
        phone: fullPhone,
        email: dummyEmail,
        address: address || city,
        city: city,
        status: 'approved',
      })
      if (sErr) console.warn('[complete-profile API] suppliers upsert warning:', sErr.message)
    } else {
      const { error: cErr } = await admin.from('customers').upsert({
        user_id: realUserId,
        name: profileName,
        phone: fullPhone,
        email: dummyEmail,
        addresses: [{
          id: 'default-addr',
          label: 'Primary',
          line1: city,
          city: city,
          is_default: true,
        }],
      })
      if (cErr) console.warn('[complete-profile API] customers upsert warning:', cErr.message)
    }

    return NextResponse.json({
      success: true,
      userId: realUserId,
      role: role,
      name: profileName,
      phone: fullPhone,
    })

  } catch (err: any) {
    console.error('[complete-profile API] Unexpected exception:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to complete profile' },
      { status: 500 }
    )
  }
}
