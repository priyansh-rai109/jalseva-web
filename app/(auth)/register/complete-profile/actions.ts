'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

async function resolveUserId(admin: any, payload: any, role: string, name: string) {
  const digits = payload.phone.replace(/\D/g, '').slice(-10)
  const fullPhone = `+91${digits}`
  const dummyEmail = `test_91${digits}@jalseva.app`
  let realUserId = payload.userId

  // If already a valid non-fallback UUID, check if user exists
  if (realUserId && !realUserId.startsWith('00000000-0000-')) {
    return realUserId
  }

  // 1. Search profiles table by phone or email
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

  // 2. Try creating user via Supabase Auth Admin API
  try {
    const { data: newAuth, error: authErr } = await admin.auth.admin.createUser({
      email: dummyEmail,
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

  // 3. Fallback: return deterministic phone UUID
  return getPhoneUuid(digits)
}

export async function upsertCustomerProfileAction(payload: any) {
  try {
    const admin = createAdminClient()
    const realUserId = await resolveUserId(admin, payload, 'customer', payload.name)
    const digits = payload.phone.replace(/\D/g, '').slice(-10)
    const fullPhone = digits ? `+91${digits}` : payload.phone
    const dummyEmail = `test_91${digits}@jalseva.app`

    console.log('[upsertCustomerProfileAction] Saving profile for userId:', realUserId, 'name:', payload.name)

    const { error: pErr } = await admin.from('profiles').upsert({
      id: realUserId,
      role: 'customer',
      name: payload.name,
      email: dummyEmail,
      phone: fullPhone,
      updated_at: new Date().toISOString(),
    })
    if (pErr) console.warn('[upsertCustomerProfileAction] Profile upsert warning:', pErr.message)

    const { error: cErr } = await admin.from('customers').upsert({
      user_id: realUserId,
      name: payload.name,
      phone: fullPhone,
      email: dummyEmail,
      addresses: [{
        id: 'default-addr',
        label: 'Primary',
        line1: payload.city,
        city: payload.city,
        is_default: true,
      }],
    })
    if (cErr) console.warn('[upsertCustomerProfileAction] Customer upsert warning:', cErr.message)

    return { success: true, userId: realUserId }
  } catch (err: any) {
    console.error('[upsertCustomerProfileAction] Unexpected error:', err)
    return { success: false, error: err?.message || 'Failed to save customer profile' }
  }
}

export async function upsertSupplierProfileAction(payload: any) {
  try {
    const admin = createAdminClient()
    const realUserId = await resolveUserId(admin, payload, 'supplier', payload.bizName)
    const digits = payload.phone.replace(/\D/g, '').slice(-10)
    const fullPhone = digits ? `+91${digits}` : payload.phone
    const dummyEmail = `test_91${digits}@jalseva.app`

    console.log('[upsertSupplierProfileAction] Saving profile for userId:', realUserId, 'bizName:', payload.bizName)

    const { error: pErr } = await admin.from('profiles').upsert({
      id: realUserId,
      role: 'supplier',
      name: payload.bizName,
      email: dummyEmail,
      phone: fullPhone,
      updated_at: new Date().toISOString(),
    })
    if (pErr) console.warn('[upsertSupplierProfileAction] Profile upsert warning:', pErr.message)

    const { error: sErr } = await admin.from('suppliers').upsert({
      user_id: realUserId,
      business_name: payload.bizName,
      owner_name: payload.ownerName,
      phone: fullPhone,
      email: dummyEmail,
      address: payload.address,
      city: payload.city,
      status: 'approved',
    })
    if (sErr) console.warn('[upsertSupplierProfileAction] Supplier upsert warning:', sErr.message)

    return { success: true, userId: realUserId }
  } catch (err: any) {
    console.error('[upsertSupplierProfileAction] Unexpected error:', err)
    return { success: false, error: err?.message || 'Failed to save supplier profile' }
  }
}
