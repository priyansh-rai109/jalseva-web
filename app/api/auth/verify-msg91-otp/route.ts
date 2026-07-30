import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────
const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken'

/**
 * Dev-only demo numbers that bypass MSG91 entirely.
 * These numbers trigger test-mode in development so the UI never even
 * launches the widget for them.  This endpoint handles them gracefully
 * in case they are ever called directly (e.g. integration tests).
 */
const DEMO_NUMBERS = ['9876543210', '9876543211']

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-msg91-otp
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      accessToken,   // JWT-style token returned by MSG91 widget on success
      phone: rawPhone, // 10-digit phone, provided by client for dev/demo bypass
      context = 'login',         // 'login' | 'register'
      selectedRole = 'customer', // only relevant when context === 'register'
    } = body

    const isDevelopment = process.env.NODE_ENV === 'development'
    const digits = rawPhone?.replace(/\D/g, '') ?? ''
    const fullPhone = `+91${digits}`

    // ── 1. Dev test-mode: demo numbers bypass MSG91 ───────────────────────
    if (isDevelopment && DEMO_NUMBERS.includes(digits)) {
      console.log('[verify-msg91-otp] Dev demo number bypass:', digits)
      const userId = getPhoneUuid(digits)
      const profile = await lookupProfile(fullPhone, userId)
      return NextResponse.json({
        success: true,
        userId: profile?.id ?? userId,
        role: profile?.role ?? null,
        phone: fullPhone,
        isNewUser: !profile?.role,
        selectedRole,
        testMode: true,
      })
    }

    // ── 2. Require access-token for all non-demo flows ────────────────────
    if (!accessToken) {
      console.error('[verify-msg91-otp] No accessToken provided')
      return NextResponse.json(
        { success: false, error: 'Missing access token' },
        { status: 400 }
      )
    }

    const authKey = process.env.MSG91_AUTHKEY
    if (!authKey) {
      console.error('[verify-msg91-otp] MSG91_AUTHKEY not configured')
      return NextResponse.json(
        { success: false, error: 'SMS service not configured' },
        { status: 500 }
      )
    }

    // ── 3. Verify token with MSG91 ─────────────────────────────────────────
    console.log('[verify-msg91-otp] Calling MSG91 verifyAccessToken...')
    const msg91Res = await fetch(MSG91_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({ 'access-token': accessToken }),
    })

    const msg91Data = await msg91Res.json()
    console.log('[verify-msg91-otp] MSG91 response:', JSON.stringify(msg91Data))

    // MSG91 returns { type: 'success', message: { mobile: '91XXXXXXXXXX', ... } }
    // on failure: { type: 'error', message: '...' }
    if (msg91Data.type !== 'success') {
      console.error('[verify-msg91-otp] MSG91 verification failed:', msg91Data)
      return NextResponse.json(
        { success: false, error: msg91Data.message || 'OTP verification failed' },
        { status: 401 }
      )
    }

    // ── 4. Extract verified phone number ───────────────────────────────────
    // MSG91 returns mobile as '91XXXXXXXXXX' (country code + 10 digits)
    const mobileRaw: string =
      msg91Data.message?.mobile ?? msg91Data.data?.mobile ?? ''
    const verifiedDigits = mobileRaw.replace(/\D/g, '').slice(-10) // last 10 digits
    const verifiedPhone = `+91${verifiedDigits}`

    if (!verifiedDigits || verifiedDigits.length !== 10) {
      console.error('[verify-msg91-otp] Could not extract phone from MSG91 response:', msg91Data)
      return NextResponse.json(
        { success: false, error: 'Could not determine verified phone number' },
        { status: 500 }
      )
    }

    console.log('[verify-msg91-otp] Verified phone:', verifiedPhone)

    // ── 5. Profile lookup in Supabase ─────────────────────────────────────
    const fallbackUserId = getPhoneUuid(verifiedDigits)
    const profile = await lookupProfile(verifiedPhone, fallbackUserId)

    return NextResponse.json({
      success: true,
      userId: profile?.id ?? fallbackUserId,
      role: profile?.role ?? null,
      phone: verifiedPhone,
      isNewUser: !profile?.role,
      selectedRole,
      testMode: false,
    })

  } catch (err: any) {
    console.error('[verify-msg91-otp] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── Profile lookup helper ────────────────────────────────────────────────────
async function lookupProfile(
  fullPhone: string,
  fallbackUserId: string
): Promise<{ id: string; role: string | null } | null> {
  try {
    const admin = createAdminClient()

    // Try by phone field first
    const { data: byPhone } = await admin
      .from('profiles')
      .select('id, role')
      .eq('phone', fullPhone)
      .maybeSingle()
    if (byPhone) {
      console.log('[verify-msg91-otp] Profile found by phone:', byPhone.id)
      return { id: byPhone.id, role: byPhone.role || null }
    }

    // Try by deterministic UUID
    const { data: byId } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', fallbackUserId)
      .maybeSingle()
    if (byId) {
      console.log('[verify-msg91-otp] Profile found by UUID:', byId.id)
      return { id: byId.id, role: byId.role || null }
    }

    // Try by dummy email pattern (legacy fallback)
    const dummyEmail = `test_${fullPhone.replace('+', '')}@jalseva.demo`
    const { data: byEmail } = await admin
      .from('profiles')
      .select('id, role')
      .eq('email', dummyEmail)
      .maybeSingle()
    if (byEmail) {
      console.log('[verify-msg91-otp] Profile found by dummy email:', byEmail.id)
      return { id: byEmail.id, role: byEmail.role || null }
    }

    console.log('[verify-msg91-otp] No existing profile found for:', fullPhone)
    return null
  } catch (err) {
    console.error('[verify-msg91-otp] Profile lookup error:', err)
    return null
  }
}
