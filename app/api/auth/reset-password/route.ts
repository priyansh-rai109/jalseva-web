import { NextRequest, NextResponse } from 'next/server'
import {
  generateResetToken,
  verifyAndConsumeResetToken,
  hashPin,
  setCredential,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit
} from '@/lib/services/security-service'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = 'request-reset', phone: rawPhone, token, newPin } = body

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const digits = (rawPhone ?? '').replace(/\D/g, '').slice(-10)
    const rateLimitKey = `reset:${clientIp}:${digits}`

    // ── 1. Request Reset Token (Rate-Limited, 15-Min Expiry) ─────────────────
    if (action === 'request-reset') {
      if (!digits || digits.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'कृपया मान्य 10-अंकों का मोबाइल नंबर दर्ज करें (Invalid mobile number)' },
          { status: 400 }
        )
      }

      // Check rate limit: max 3 reset requests per 15 minutes
      const rateCheck = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000)
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: 'बहुत अधिक रीसेट प्रयास! कृपया 15 मिनट बाद प्रयास करें (Too many reset requests. Please wait 15 minutes.)' },
          { status: 429 }
        )
      }

      // Generate secure 15-minute token
      const resetToken = generateResetToken(digits, 15)

      return NextResponse.json({
        success: true,
        token: resetToken,
        expiresInMinutes: 15,
        message: '15-मिनट का रीसेट टोकन सफलतापूर्वक जनरेट हुआ (15-minute reset token generated)',
      })
    }

    // ── 2. Confirm Password / PIN Reset ─────────────────────────────────────
    if (action === 'confirm-reset') {
      if (!token || typeof token !== 'string') {
        return NextResponse.json(
          { success: false, error: 'रीसेट टोकन आवश्यक है (Reset token is required)' },
          { status: 400 }
        )
      }

      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return NextResponse.json(
          { success: false, error: 'नया सुरक्षा पिन केवल 4 अंकों का होना चाहिए (New PIN must be 4 digits)' },
          { status: 400 }
        )
      }

      // Check for weak PINs
      if (['0000', '1111', '1234', '9999'].includes(newPin)) {
        return NextResponse.json(
          { success: false, error: 'कृपया अधिक सुरक्षित पिन चुनें (उदा. 4582)। 0000, 1111, 1234 मान्य नहीं हैं।' },
          { status: 400 }
        )
      }

      // Verify and consume the single-use token
      const tokenResult = verifyAndConsumeResetToken(token)
      if (!tokenResult.valid || !tokenResult.identifier) {
        recordFailedAttempt(rateLimitKey, 3, 15 * 60 * 1000)
        return NextResponse.json(
          { success: false, error: tokenResult.error || 'अमान्य या समाप्त टोकन (Invalid or expired reset token)' },
          { status: 400 }
        )
      }

      const phoneDigits = tokenResult.identifier
      const { hash, salt } = hashPin(newPin)

      // 1. Store in shared credential store
      setCredential(phoneDigits, hash, salt)

      // 2. Clear any rate limits on this phone
      resetRateLimit(rateLimitKey)
      resetRateLimit(`${clientIp}:${phoneDigits}`)

      // 3. Update in Supabase Database (profiles & auth user_metadata)
      const admin = createAdminClient()
      const fullPhone = `+91${phoneDigits}`
      const dummyEmail = `user_91${phoneDigits}@jalseva.app`

      try {
        // Query profiles, suppliers, or customers to identify user
        let targetUserId: string | null = null
        let targetRole = 'customer'
        let targetName = 'JalSeva User'

        const { data: profile } = await admin
          .from('profiles')
          .select('*')
          .or(`phone.eq.${fullPhone},phone.eq.${phoneDigits},phone.ilike.%${phoneDigits}%`)
          .maybeSingle()

        if (profile) {
          targetUserId = profile.id
          targetRole = profile.role || targetRole
          targetName = profile.name || targetName
        }

        if (!targetUserId) {
          const { data: supplier } = await admin
            .from('suppliers')
            .select('*')
            .or(`phone.eq.${fullPhone},phone.eq.${phoneDigits},phone.ilike.%${phoneDigits}%`)
            .maybeSingle()
          if (supplier) {
            targetUserId = supplier.user_id
            targetRole = 'supplier'
            targetName = supplier.business_name || supplier.owner_name || targetName
          }
        }

        if (!targetUserId) {
          const { data: customer } = await admin
            .from('customers')
            .select('*')
            .or(`phone.eq.${fullPhone},phone.eq.${phoneDigits},phone.ilike.%${phoneDigits}%`)
            .maybeSingle()
          if (customer) {
            targetUserId = customer.user_id
            targetRole = 'customer'
            targetName = customer.name || targetName
          }
        }

        // Update profiles timestamp
        await admin
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .or(`phone.eq.${fullPhone},phone.eq.${phoneDigits}`)

        // Robust auth user lookup
        const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const foundUser = usersData?.users?.find((u: any) => {
          const uDigits = (u.phone || '').replace(/\D/g, '').slice(-10)
          const mDigits = (u.user_metadata?.phone || '').replace(/\D/g, '').slice(-10)
          return (
            (targetUserId && u.id === targetUserId) ||
            uDigits === phoneDigits ||
            mDigits === phoneDigits ||
            u.email === dummyEmail ||
            u.email?.includes(phoneDigits)
          )
        })

        if (foundUser) {
          await admin.auth.admin.updateUserById(foundUser.id, {
            user_metadata: {
              ...foundUser.user_metadata,
              phone: fullPhone,
              pin_hash: hash,
              pin_salt: salt,
            }
          })
        } else if (targetUserId) {
          await admin.auth.admin.createUser({
            id: targetUserId,
            phone: fullPhone,
            email: dummyEmail,
            password: 'PinAuth!' + phoneDigits,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: {
              role: targetRole,
              name: targetName,
              phone: fullPhone,
              pin_hash: hash,
              pin_salt: salt,
            }
          })
        }
      } catch (e) {
        console.warn('[reset-password] Profile/auth update notice:', e)
      }

      return NextResponse.json({
        success: true,
        message: 'सुरक्षा पिन सफलतापूर्वक रीसेट हो गया है! अब आप नए पिन से लॉगिन कर सकते हैं। (PIN reset successfully!)',
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[reset-password] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Password reset failed' },
      { status: 500 }
    )
  }
}
