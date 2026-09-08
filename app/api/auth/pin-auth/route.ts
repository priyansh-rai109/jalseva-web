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

      // 1. Strict check: reject if user already exists
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id, role, name, phone')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
        .maybeSingle()

      const { data: existingSupCheck } = await admin
        .from('suppliers')
        .select('id, business_name')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()

      const { data: existingCustCheck } = await admin
        .from('customers')
        .select('id, name')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()

      if (existingProfile || existingSupCheck || existingCustCheck) {
        return NextResponse.json(
          {
            success: false,
            code: 'ACCOUNT_EXISTS',
            error: 'यह मोबाइल नंबर पहले से रजिस्टर्ड है! कृपया लॉगिन करें। (Account already exists for this number. Please sign in.)',
            phone: digits,
          },
          { status: 409 }
        )
      }

      const displayName = (role === 'supplier' ? (bizName || name) : name) || 'JalSeva User'

      // Generate Cryptographic Salt & Hash
      const { hash, salt } = hashPin(pin)
      setCredential(digits, hash, salt)

      let userId = fallbackUserId

      // Try creating user in Supabase Auth or update existing auth user with pin_hash & pin_salt
      try {
        const { data: newAuth, error: authCreateErr } = await admin.auth.admin.createUser({
          email: dummyEmail,
          password: `PinUser@${hash.slice(0, 12)}!`,
          email_confirm: true,
          user_metadata: { role, name: displayName, phone: fullPhone, pin_hash: hash, pin_salt: salt }
        })
        if (newAuth?.user?.id) {
          userId = newAuth.user.id
        } else if (authCreateErr) {
          // If auth user exists with dummyEmail, update their metadata with new pin_hash & pin_salt
          const { data: usersData } = await admin.auth.admin.listUsers()
          const existingAuth = usersData?.users?.find(
            (u: any) => u.email === dummyEmail || u.phone === fullPhone || u.user_metadata?.phone === fullPhone
          )
          if (existingAuth) {
            userId = existingAuth.id
            await admin.auth.admin.updateUserById(existingAuth.id, {
              user_metadata: {
                ...existingAuth.user_metadata,
                role,
                name: displayName,
                phone: fullPhone,
                pin_hash: hash,
                pin_salt: salt,
              }
            })
          }
        }
      } catch (e) {
        console.warn('[pin-auth] Auth create notice:', e)
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
      } else {
        // Ensure customer record
        const { data: existingCust } = await admin
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existingCust) {
          await admin.from('customers').insert({
            user_id: userId,
            name: displayName,
            phone: fullPhone,
            email: dummyEmail,
            addresses: [
              {
                id: 'default-addr',
                city: city,
                label: 'Primary',
                line1: address || city,
                is_default: true,
              },
            ],
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

      // Set secure Signed HttpOnly Session Cookie (Session-based, no persistent maxAge)
      response.cookies.set('jalseva-session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      // Maintain session cookie for client state
      response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify({
        id: userId,
        phone: fullPhone,
        user_metadata: { role, name: displayName, phone: fullPhone }
      })), {
        path: '/',
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

      // 1. Lookup profile in database
      let { data: profile } = await admin
        .from('profiles')
        .select('*')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},email.eq.${dummyEmail}`)
        .maybeSingle()

      // 2. Check suppliers table
      const { data: supplierRec } = await admin
        .from('suppliers')
        .select('*')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()

      // 3. Check customers table
      const { data: custRec } = await admin
        .from('customers')
        .select('*')
        .or(`phone.eq.${fullPhone},phone.eq.${digits},phone.ilike.%${digits}%`)
        .maybeSingle()

      // STRICT CHECK: If user does not exist anywhere, reject direct login!
      if (!profile && !supplierRec && !custRec) {
        return NextResponse.json(
          {
            success: false,
            code: 'ACCOUNT_NOT_FOUND',
            error: 'इस नंबर से कोई अकाउंट नहीं मिला! कृपया पहले नया अकाउंट बनाएं। (Account not found. Please register first.)',
            phone: digits,
          },
          { status: 404 }
        )
      }

      let userRole: 'customer' | 'supplier' | 'super_admin' = (profile?.role as any) || null
      let userName = profile?.name || null
      let userId = profile?.id || null

      if (supplierRec && userRole !== 'super_admin') {
        userRole = 'supplier'
        userName = userName || supplierRec.business_name || supplierRec.owner_name
        userId = userId || supplierRec.user_id || fallbackUserId

        // Auto-heal profiles table
        await admin.from('profiles').upsert({
          id: userId,
          role: 'supplier',
          name: userName,
          phone: fullPhone,
          email: dummyEmail,
          updated_at: new Date().toISOString(),
        })
      } else if (!userRole && custRec) {
        userRole = 'customer'
        userName = userName || custRec.name
        userId = userId || custRec.user_id || fallbackUserId
      }

      userRole = userRole || 'customer'
      userName = userName || 'JalSeva User'
      userId = userId || fallbackUserId

      // 1. Lookup stored credentials: First in memory cache, then permanently from Supabase Auth database
      let cred = getCredential(digits)

      if (!cred) {
        // Query Supabase Auth database for persisted custom PIN
        if (userId && !userId.startsWith('00000000-0000-')) {
          try {
            const { data: userRec } = await admin.auth.admin.getUserById(userId)
            if (userRec?.user?.user_metadata?.pin_hash && userRec?.user?.user_metadata?.pin_salt) {
              cred = {
                hash: userRec.user.user_metadata.pin_hash,
                salt: userRec.user.user_metadata.pin_salt,
              }
              setCredential(digits, cred.hash, cred.salt)
            }
          } catch (e) {
            console.warn('[pin-auth] getUserById error:', e)
          }
        }

        if (!cred) {
          try {
            const { data: usersData } = await admin.auth.admin.listUsers()
            const foundUser = usersData?.users?.find(
              (u: any) => u.email === dummyEmail || u.phone === fullPhone || u.user_metadata?.phone === fullPhone
            )
            if (foundUser?.user_metadata?.pin_hash && foundUser?.user_metadata?.pin_salt) {
              cred = {
                hash: foundUser.user_metadata.pin_hash,
                salt: foundUser.user_metadata.pin_salt,
              }
              setCredential(digits, cred.hash, cred.salt)
            }
          } catch (e) {
            console.warn('[pin-auth] listUsers error:', e)
          }
        }
      }

      // Pre-seeded demo numbers fallback
      const isDemoAccount = ['9876543210', '9829012345'].includes(digits)
      if (!cred && isDemoAccount) {
        cred = hashPin('1234')
        setCredential(digits, cred.hash, cred.salt)
      }

      // If user exists in database but never had a custom PIN saved (legacy accounts created before PIN system)
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
            error: `गलत सुरक्षा पिन! कृपया रजिस्ट्रेशन के समय बनाया गया 4-अंकों का पिन डालें। (${updatedRate.remaining} प्रयास शेष)`,
          },
          { status: 401 }
        )
      }

      // Successful verification -> Reset Rate Limit
      resetRateLimit(rateLimitKey)

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
        isNewUser: false,
      })

      // Set Secure HTTP-Only Signed Session Cookie (Session-based, no persistent maxAge)
      response.cookies.set('jalseva-session-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      // Maintain session cookie for client state
      response.cookies.set('jalseva-mock-session', encodeURIComponent(JSON.stringify({
        id: userId,
        phone: fullPhone,
        user_metadata: { role: userRole, name: userName, phone: fullPhone }
      })), {
        path: '/',
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

      // Check weak PINs
      if (['0000', '1111', '1234', '9999'].includes(pin)) {
        return NextResponse.json(
          { success: false, error: 'कृपया अधिक सुरक्षित पिन चुनें (उदा. 4582)। 0000, 1111, 1234 मान्य नहीं हैं।' },
          { status: 400 }
        )
      }

      let cred = getCredential(digits)
      if (!cred) {
        try {
          const { data: usersData } = await admin.auth.admin.listUsers()
          const foundUser = usersData?.users?.find(
            (u: any) => u.email === dummyEmail || u.phone === fullPhone || u.user_metadata?.phone === fullPhone
          )
          if (foundUser?.user_metadata?.pin_hash && foundUser?.user_metadata?.pin_salt) {
            cred = { hash: foundUser.user_metadata.pin_hash, salt: foundUser.user_metadata.pin_salt }
            setCredential(digits, cred.hash, cred.salt)
          } else {
            cred = hashPin('1234')
          }
        } catch {
          cred = hashPin('1234')
        }
      }

      if (!verifyPinHash(currentPin, cred.hash, cred.salt)) {
        return NextResponse.json(
          { success: false, error: 'वर्तमान पिन गलत है! (Current PIN is incorrect)' },
          { status: 401 }
        )
      }

      // Hash and store new PIN in RAM
      const newCred = hashPin(pin)
      setCredential(digits, newCred.hash, newCred.salt)

      // Persist new PIN in Supabase Auth database
      try {
        const { data: usersData } = await admin.auth.admin.listUsers()
        const foundUser = usersData?.users?.find(
          (u: any) => u.email === dummyEmail || u.phone === fullPhone || u.user_metadata?.phone === fullPhone
        )
        if (foundUser) {
          await admin.auth.admin.updateUserById(foundUser.id, {
            user_metadata: {
              ...foundUser.user_metadata,
              pin_hash: newCred.hash,
              pin_salt: newCred.salt,
            }
          })
        }
      } catch (e) {
        console.warn('[change-pin] Error saving new PIN to auth database:', e)
      }

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
