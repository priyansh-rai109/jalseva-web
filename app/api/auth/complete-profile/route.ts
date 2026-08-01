import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

async function resolveUserId(admin: any, payload: any, role: string, name: string) {
  const digits = (payload.phone ?? '').replace(/\D/g, '').slice(-10)
  const fullPhone = `+91${digits}`
  const dummyEmail = `test_91${digits}@jalseva.app`
  const realUserId = payload.userId

  console.log('[CompleteProfile] [resolveUserId] Input:', { realUserId, fullPhone, dummyEmail, role, name })

  // 1. If valid non-fallback UUID provided
  if (realUserId && typeof realUserId === 'string' && !realUserId.startsWith('00000000-0000-')) {
    console.log('[CompleteProfile] [resolveUserId] Using existing valid UUID:', realUserId)
    return realUserId
  }

  // 2. Search profiles table by phone or email
  try {
    const { data: p, error: pErr } = await admin
      .from('profiles')
      .select('id')
      .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
      .maybeSingle()
    if (pErr) console.warn('[CompleteProfile] [resolveUserId] Profile query error:', pErr)
    if (p?.id) {
      console.log('[CompleteProfile] [resolveUserId] Found profile ID from DB:', p.id)
      return p.id
    }
  } catch (e) {
    console.warn('[CompleteProfile] [resolveUserId] Profile query exception:', e)
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
      console.log('[CompleteProfile] [resolveUserId] Created new Auth user ID:', newAuth.user.id)
      return newAuth.user.id
    }

    if (authErr) {
      console.warn('[CompleteProfile] [resolveUserId] Auth user create error:', authErr.message)
      const { data: usersData } = await admin.auth.admin.listUsers()
      const existingUser = usersData?.users?.find(
        (u: any) => u.email === dummyEmail || u.phone === fullPhone
      )
      if (existingUser?.id) {
        console.log('[CompleteProfile] [resolveUserId] Found existing Auth user ID:', existingUser.id)
        return existingUser.id
      }
    }
  } catch (err) {
    console.warn('[CompleteProfile] [resolveUserId] Auth createUser exception:', err)
  }

  // 4. Fallback: return deterministic phone UUID
  const fallbackUuid = getPhoneUuid(digits)
  console.log('[CompleteProfile] [resolveUserId] Using fallback phone UUID:', fallbackUuid)
  return fallbackUuid
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[CompleteProfile] Received data:', body)

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

    console.log('[CompleteProfile] Session/user check:', { rawUserId, rawPhone, digits, fullPhone, profileName })

    const admin = createAdminClient()
    const realUserId = await resolveUserId(admin, { userId: rawUserId, phone: fullPhone }, role, profileName)

    console.log('[CompleteProfile] Attempting profile insert for userId:', realUserId)

    // Upsert into profiles
    const { data: pData, error: pErr } = await admin.from('profiles').upsert({
      id: realUserId,
      role: role,
      name: profileName,
      email: dummyEmail,
      phone: fullPhone,
      updated_at: new Date().toISOString(),
    }).select()

    console.log('[CompleteProfile] Insert result (profiles):', pData)
    if (pErr) console.error('[CompleteProfile] Insert error (profiles):', pErr)

    if (role === 'supplier') {
      const { data: sData, error: sErr } = await admin.from('suppliers').upsert({
        user_id: realUserId,
        business_name: bizName || profileName,
        owner_name: ownerName || profileName,
        phone: fullPhone,
        email: dummyEmail,
        address: address || city,
        city: city,
        status: 'approved',
      }).select()
      console.log('[CompleteProfile] Insert result (suppliers):', sData)
      if (sErr) console.error('[CompleteProfile] Insert error (suppliers):', sErr)
    } else {
      const { data: cData, error: cErr } = await admin.from('customers').upsert({
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
      }).select()
      console.log('[CompleteProfile] Insert result (customers):', cData)
      if (cErr) console.error('[CompleteProfile] Insert error (customers):', cErr)
    }

    return NextResponse.json({
      success: true,
      userId: realUserId,
      role: role,
      name: profileName,
      phone: fullPhone,
    })

  } catch (err: any) {
    console.error('[CompleteProfile] Unexpected exception:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to complete profile' },
      { status: 500 }
    )
  }
}
