import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const phoneToUse = user.phone || user.user_metadata?.phone

    let profile: any = null
    let customer: any = null

    // 1. Get profile by id
    const { data: pData } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    profile = pData

    // 2. Get customer by user_id or phone
    const { data: cData } = await adminSupabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cData) {
      customer = cData
    } else if (phoneToUse) {
      const digits = phoneToUse.replace(/\D/g, '').slice(-10)
      if (digits) {
        const { data: byPhone } = await adminSupabase
          .from('customers')
          .select('*')
          .ilike('phone', `%${digits}%`)
          .maybeSingle()
        if (byPhone) customer = byPhone
      }
    }

    const name = customer?.name || profile?.name || user.user_metadata?.name || 'Customer'
    const phone = customer?.phone || profile?.phone || user.phone || user.user_metadata?.phone || ''
    const email = customer?.email || profile?.email || user.email || ''
    const addresses = customer?.addresses || []

    return NextResponse.json({
      name,
      phone,
      email,
      addresses,
      profile,
      customer,
    })
  } catch (err: any) {
    console.error('[Customer Profile GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, addresses } = body

    const adminSupabase = createAdminClient()
    const phoneToUse = phone || user.phone || user.user_metadata?.phone

    // Update profiles table
    if (name || phone) {
      await adminSupabase.from('profiles').upsert({
        id: user.id,
        name: name || user.user_metadata?.name || 'Customer',
        phone: phone || phoneToUse || null,
        role: 'customer',
        updated_at: new Date().toISOString(),
      })
    }

    // Update customers table
    const updatePayload: any = {}
    if (name) updatePayload.name = name
    if (phone) updatePayload.phone = phone
    if (addresses) updatePayload.addresses = addresses

    // Find customer ID
    let customerId: string | null = null
    const { data: cData } = await adminSupabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cData) {
      customerId = cData.id
    } else if (phoneToUse) {
      const digits = phoneToUse.replace(/\D/g, '').slice(-10)
      if (digits) {
        const { data: byPhone } = await adminSupabase
          .from('customers')
          .select('id')
          .ilike('phone', `%${digits}%`)
          .maybeSingle()
        if (byPhone) customerId = byPhone.id
      }
    }

    if (customerId) {
      await adminSupabase
        .from('customers')
        .update(updatePayload)
        .eq('id', customerId)
    } else {
      await adminSupabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: name || 'Customer',
          phone: phone || phoneToUse || '9876543210',
          addresses: addresses || [],
        })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Customer Profile PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
