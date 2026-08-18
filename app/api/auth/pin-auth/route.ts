import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'
import {
  hashPin,
  verifyPinHash,
  setCredential,
  getCredential,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  signSessionToken
} from '@/lib/services/security-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      action = 'login', // 'login' | 'register' | 'change-pin'
      phone: rawPhone,
      pin: rawPin,
      currentPin: rawCurrentPin,
      name,
      role = 'customer',
      bizName,
      address,
      city = 'Jodhpur',
      zoneId,
    } = body

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const digits = (rawPhone ?? '').replace(/\D/g, '').slice(-10)
    const pin = String(rawPin ?? '').trim()
    const fullPhone = `+91${digits}`
    const dummyEmail = `user_91${digits}@jalseva.app`

    if (!digits || digits.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें (Invalid 10-digit mobile number)' },
        { status: 400 }
      )
    }

    const rateLimitKey = `${clientIp}:${digits}`
    const admin = createAdminClient()
    const fallbackUserId = getPhoneUuid(digits)

    // ── 1. REGISTER ACTION ──────────────────────────────────────────────────
    if (action === 'register') {
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return NextResponse.json(
          { success: false, error: 'सुरक्षा पिन केवल 4 अंकों का होना चाहिए (PIN must be exactly 4 numeric digits)' },
          { status: 400 }
        )
      }

      // Check weak PINs
      if (['0000', '1111', '1234', '9999'].includes(pin)) {
        return NextResponse.json(
          { success: false, error: 'कृपया अधिक सुरक्षित पिन चुनें (उदा. 4582)। 0000, 1111, 1234 मान्य नहीं हैं।' },
          { status: 400 }
        )
      }

      const displayName = (role === 'supplier' ? (bizName || name) : name) || 'JalSeva User'

      // Generate Cryptographic Salt & Hash
      const { hash, salt } = hashPin(pin)
      setCredential(digits, hash, salt)

      // Check if user already exists
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('*')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
        .maybeSingle()

      let userId = existingProfile?.id || fallbackUserId

      // Try creating user in Supabase Auth
      if (!existingProfile) {
        try {
          const { data: newAuth } = await admin.auth.admin.createUser({
            email: dummyEmail,
            password: `PinUser@${hash.slice(0, 12)}!`,
            email_confirm: true,
            user_metadata: { role, name: displayName, phone: fullPhone, pin_hash: hash, pin_salt: salt }
          })
          if (newAuth?.user?.id) userId = newAuth.user.id
        } catch (e) {
          console.warn('[pin-auth] Auth create notice:', e)
        }
      }

      // Upsert into profiles
      await admin.from('profiles').upsert({
        id: userId,
        role: role,
        name: displayName,
        phone: fullPhone,
        email: dummyEmail,
        updated_at: new Date().toISOString(),
      })

      // If supplier, ensure supplier record
      if (role === 'supplier') {
        const { data: existingSup } = await admin
          .from('suppliers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existingSup) {
          await admin.from('suppliers').insert({
            user_id: userId,
            business_name: bizName || displayName,
            owner_name: name || displayName,
            phone: fullPhone,
            email: dummyEmail,
            address: address || `${city}, Rajasthan`,
            city: city,
            zone_id: zoneId || null,
            status: 'approved',
            rating: 4.8,
            total_orders: 0,
            description: `${bizName || displayName} - Fresh RO & Mineral Water Delivery in ${city}.`,
          })
        }
      }

      // Generate Cryptographically Signed Session Token
      const sessionToken = signSessionToken({
        id: userId,
        role: role as 'customer' | 'supplier',
        name: displayName,
        phone: fullPhone,
        email: dummyEmail,
      })

      const response = NextResponse.json({
        success: true,
        userId: userId,
        role: role,
        name: displayName,
        phone: fullPhone,
        message: 'Account created successfully with Cryptographic Security PIN!',
      })

      // Set secure Signed HttpOnly Cookie
      response.cookies.set('jalseva-session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7,
      })

      // Maintain legacy cookie for client state
      response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify({
        id: userId,
        phone: fullPhone,
        user_metadata: { role, name: displayName, phone: fullPhone }
      })), {
        path: '/',
        maxAge: 86400 * 7,
        sameSite: 'lax',
      })

      resetRateLimit(rateLimitKey)
      return response
    }

    // ── 2. LOGIN ACTION (Rate-Limited & Salted PBKDF2) ──────────────────────
    if (action === 'login') {
      // Check Rate Limit (5 attempts / 15 mins)
      const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000)
      if (!rateCheck.allowed) {
        const remainingMins = Math.ceil(((rateCheck.lockedUntil || Date.now()) - Date.now()) / 60000)
        return NextResponse.json(
          {
            success: false,
            error: `सुरक्षा कारणों से यह खाता अस्थायी रूप से लॉक है। कृपया ${remainingMins} मिनट बाद पुनः प्रयास करें। (Account temporarily locked due to excessive failed attempts. Please retry in ${remainingMins} minutes.)`,
          },
          { status: 429 }
        )
      }

      if (!pin || pin.length < 4) {
        return NextResponse.json(
          { success: false, error: 'कृपया अपना 4-अंकों का सुरक्षा पिन दर्ज करें (Enter your 4-digit PIN)' },
          { status: 400 }
        )
      }

      // Lookup profile in database
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
        .maybeSingle()

      // Lookup stored credentials
      let cred = getCredential(digits)

      // If user exists without custom credentials, check against default legacy seed
      if (!cred) {
        cred = hashPin('1234')
        setCredential(digits, cred.hash, cred.salt)
      }

      const isValid = verifyPinHash(pin, cred.hash, cred.salt)

      if (!isValid) {
        recordFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000)
        const updatedRate = checkRateLimit(rateLimitKey, 5)
        return NextResponse.json(
          {
            success: false,
            error: `गलत सुरक्षा पिन! आपके पास ${updatedRate.remaining} प्रयास शेष हैं। (Incorrect PIN. ${updatedRate.remaining} attempts remaining.)`,
          },
          { status: 401 }
        )
      }

      // Successful verification -> Reset Rate Limit
      resetRateLimit(rateLimitKey)

      const userRole = (profile?.role || 'customer') as 'customer' | 'supplier' | 'super_admin'
      const userName = profile?.name || 'JalSeva User'
      const userId = profile?.id || fallbackUserId

      // Generate Signed HMAC Session Token
      const sessionToken = signSessionToken({
        id: userId,
        role: userRole,
        name: userName,
        phone: fullPhone,
        email: dummyEmail,
      })

      const response = NextResponse.json({
        success: true,
        userId: userId,
        role: userRole,
        name: userName,
        phone: fullPhone,
        isNewUser: !profile,
      })

      // Set Secure HTTP-Only Signed Session Cookie
      response.cookies.set('jalseva-session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7,
      })

      // Maintain legacy cookie for client state
      response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify({
        id: userId,
        phone: fullPhone,
        user_metadata: { role: userRole, name: userName, phone: fullPhone }
      })), {
        path: '/',
        maxAge: 86400 * 7,
        sameSite: 'lax',
      })

      return response
    }

    // ── 3. SECURE CHANGE PIN ACTION (Authenticated) ─────────────────────────
    if (action === 'change-pin') {
      const currentPin = String(rawCurrentPin ?? '').trim()
      if (!currentPin || !pin || pin.length !== 4) {
        return NextResponse.json(
          { success: false, error: 'कृपया वर्तमान पिन और नया 4-अंकों का पिन दर्ज करें (Current and New 4-digit PIN required)' },
          { status: 400 }
        )
      }

      let cred = getCredential(digits)
      if (!cred) cred = hashPin('1234')

      if (!verifyPinHash(currentPin, cred.hash, cred.salt)) {
        return NextResponse.json(
          { success: false, error: 'वर्तमान पिन गलत है! (Current PIN is incorrect)' },
          { status: 401 }
        )
      }

      // Hash and store new PIN
      const newCred = hashPin(pin)
      setCredential(digits, newCred.hash, newCred.salt)

      return NextResponse.json({
        success: true,
        message: 'सुरक्षा पिन सफलतापूर्वक अपडेट हो गया है! (Security PIN updated successfully!)',
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[pin-auth] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Authentication failed' },
      { status: 500 }
    )
  }
}
