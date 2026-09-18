import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlaceholderName, resolveRealName } from '@/lib/utils'

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
    const digits = phoneToUse ? phoneToUse.replace(/\D/g, '').slice(-10) : ''

    let profile: any = null
    let customer: any = null

    // 1. Get profile by id
    const { data: pData } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    profile = pData
    if (!profile && digits) {
      const { data: pByPhone } = await adminSupabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.+91${digits},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()
      if (pByPhone) profile = pByPhone
    }

    // 2. Get customer by user_id or phone
    const { data: cData } = await adminSupabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (cData) {
      customer = cData
    } else if (profile?.id) {
      const { data: byProfId } = await adminSupabase
        .from('customers')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle()
      if (byProfId) customer = byProfId
    }

    if (!customer && digits) {
      const { data: byPhone } = await adminSupabase
        .from('customers')
        .select('*')
        .or(`phone.eq.+91${digits},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()
      if (byPhone) customer = byPhone
    }

    const realName = resolveRealName([
      customer?.name,
      profile?.name,
      user.user_metadata?.name,
      user.user_metadata?.full_name,
      (user as any).name,
    ])

    const name = formatDisplayName(realName || customer?.name || profile?.name || user.user_metadata?.name, null, 'customer')
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

    // Update auth user metadata if real auth user
    if (user.id && !user.id.startsWith('00000000-0000-')) {
      try {
        await adminSupabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata || {}),
            ...(name ? { name } : {}),
            ...(phoneToUse ? { phone: phoneToUse } : {}),
          }
        })
      } catch {}
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

    const response = NextResponse.json({ success: true, name })

    // Update mock session cookie so sidebar and client update immediately
    const sessionUser = {
      ...user,
      id: user.id,
      phone: phoneToUse || user.phone,
      user_metadata: {
        ...(user.user_metadata || {}),
        ...(name ? { name } : {}),
        phone: phoneToUse || user.phone,
      }
    }
    response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify(sessionUser)), {
      path: '/',
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    console.error('[Customer Profile PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
