import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPhoneUuid } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { role, name, email, phone, city, business_name, owner_name, address } = body

    if (!role || !phone) {
      return NextResponse.json({ error: 'Role and phone number required' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const formattedPhone = `+91${cleanPhone}`
    const userId = getPhoneUuid(cleanPhone)

    const supabase = await createClient()

    // 1. Safe server-side DB upsert on profiles table
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        role: role,
        name: name || business_name || 'User',
        email: email || `${cleanPhone}@jalseva.in`,
        phone: formattedPhone,
        updated_at: new Date().toISOString()
      })
    } catch (dbErr) {
      console.warn('[Profile DB Upsert Notice]:', dbErr)
    }

    // 2. Safe server-side DB upsert on role table
    if (role === 'customer') {
      try {
        await supabase.from('customers').upsert({
          user_id: userId,
          name: name || 'Customer',
          phone: formattedPhone,
          email: email || null,
          addresses: [
            {
              id: 'default-addr',
              label: 'Primary Address',
              line1: city || 'Jodhpur',
              city: city || 'Jodhpur',
              is_default: true
            }
          ]
        })
      } catch (custErr) {
        console.warn('[Customer DB Upsert Notice]:', custErr)
      }
    } else if (role === 'supplier') {
      try {
        await supabase.from('suppliers').upsert({
          user_id: userId,
          business_name: business_name || name || 'Water Supplier',
          owner_name: owner_name || name || 'Owner',
          phone: formattedPhone,
          email: email || null,
          address: address || 'Jodhpur',
          city: city || 'Jodhpur',
          status: 'pending'
        })
      } catch (suppErr) {
        console.warn('[Supplier DB Upsert Notice]:', suppErr)
      }
    }

    // 3. User session object for cookie
    const userSession = {
      id: userId,
      phone: formattedPhone,
      email: email || `${cleanPhone}@jalseva.in`,
      user_metadata: {
        role: role,
        name: name || business_name || 'User',
        phone: formattedPhone,
      }
    }

    const redirectPath = role === 'supplier' ? '/supplier/pending' : '/customer/dashboard'
    const response = NextResponse.json({ success: true, redirect: redirectPath, user: userSession })

    // Set cookie on response for instant persistence
    response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify(userSession)), {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax'
    })

    return response
  } catch (err: any) {
    console.error('API complete-profile error:', err)
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 })
  }
}
