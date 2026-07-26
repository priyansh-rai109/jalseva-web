'use server'
import { createAdminClient } from '@/lib/supabase/admin'

async function resolveUserId(admin: any, payload: any, role: string, name: string) {
  let realUserId = payload.userId
  if (realUserId.startsWith('00000000-0000-')) {
    const dummyEmail = `test_${payload.phone.replace('+', '')}@jalseva.demo`
    const { data: newAuth, error: authErr } = await admin.auth.admin.createUser({
      phone: payload.phone,
      email: dummyEmail,
      password: 'MockUser123!',
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { role, name, phone: payload.phone }
    })
    
    if (newAuth?.user?.id) {
       realUserId = newAuth.user.id
    } else if (authErr?.message.includes('already registered')) {
       const { data: profile } = await admin.from('profiles').select('id').eq('email', dummyEmail).maybeSingle()
       if (profile) realUserId = profile.id
    }
  }
  return realUserId
}

export async function upsertCustomerProfileAction(payload: any) {
  const admin = createAdminClient()
  const realUserId = await resolveUserId(admin, payload, 'customer', payload.name)

  const { error: pErr } = await admin.from('profiles').upsert({
    id: realUserId,
    role: 'customer',
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    updated_at: new Date().toISOString(),
  })
  if (pErr) throw new Error(pErr.message)

  const { error: cErr } = await admin.from('customers').upsert({
    user_id: realUserId,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    addresses: [{
      id: 'default-addr',
      label: 'Primary',
      line1: payload.city,
      city: payload.city,
      is_default: true,
    }],
  })
  if (cErr) throw new Error(cErr.message)
  
  return realUserId
}

export async function upsertSupplierProfileAction(payload: any) {
  const admin = createAdminClient()
  const realUserId = await resolveUserId(admin, payload, 'supplier', payload.bizName)

  const { error: pErr } = await admin.from('profiles').upsert({
    id: realUserId,
    role: 'supplier',
    name: payload.bizName,
    email: payload.email,
    phone: payload.phone,
    updated_at: new Date().toISOString(),
  })
  if (pErr) throw new Error(pErr.message)

  const { error: sErr } = await admin.from('suppliers').upsert({
    user_id: realUserId,
    business_name: payload.bizName,
    owner_name: payload.ownerName,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    city: payload.city,
    status: 'pending',
  })
  if (sErr) throw new Error(sErr.message)
  
  return realUserId
}
