import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhoneUuid } from '@/lib/utils'

const DEMO_NUMBERS = ['9876543210', '9876543211']
const TEST_OTP = '123456'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      phone: rawPhone,
      otp,
      requestId,
      selectedRole = 'customer',
    } = body

    const isDevelopment = process.env.NODE_ENV === 'development'
    const digits = rawPhone?.replace(/\D/g, '').slice(-10) ?? ''
    const fullPhone = `+91${digits}`
    const enteredOtp = String(otp ?? '').trim()

    if (!digits || digits.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid 10-digit mobile number' },
        { status: 400 }
      )
    }

    if (!enteredOtp || enteredOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Please enter the 6-digit OTP' },
        { status: 400 }
      )
    }

    const fallbackUserId = getPhoneUuid(digits)

    // ── 1. Dev Demo / Test Mode ───────────────────────────────────────────
    if (isDevelopment && (DEMO_NUMBERS.includes(digits) || enteredOtp === TEST_OTP)) {
      console.log('[verify-msg91-otp-v2] Dev test mode OTP accepted for:', digits)
      const profile = await lookupProfile(digits, fullPhone, fallbackUserId)
      const role = profile?.role ?? null
      const isNewUser = !profile || !profile.role || profile.role === ''
      return NextResponse.json({
        success: true,
        userId: profile?.id ?? fallbackUserId,
        role: role,
        isNewUser: isNewUser,
        name: profile?.name ?? null,
        phone: fullPhone,
        selectedRole,
        testMode: true,
      })
    }

    const authKey = process.env.MSG91_AUTHKEY
    const widgetId = process.env.MSG91_WIDGET_ID

    if (!authKey) {
      console.error('[verify-msg91-otp-v2] MSG91_AUTHKEY missing')
      return NextResponse.json(
        { success: false, error: 'SMS service configuration missing' },
        { status: 500 }
      )
    }

    const formattedMobile = `91${digits}`
    console.log('[verify-msg91-otp-v2] Verifying OTP via MSG91 API for:', formattedMobile, 'OTP:', enteredOtp)

    let isVerified = false
    let lastErrorMsg = 'Invalid OTP. Please try again.'

    // ── 2. Widget Verify OTP API (if Widget ID present) ────────────────────
    if (widgetId) {
      try {
        const payload: any = {
          widgetId: widgetId.trim(),
          identifier: formattedMobile,
          otp: enteredOtp,
        }
        if (requestId) payload.reqId = requestId

        const widgetVerifyRes = await fetch('https://control.msg91.com/api/v5/widget/verifyOtp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
          body: JSON.stringify(payload),
        })

        const widgetVerifyData = await widgetVerifyRes.json()
        console.log('[verify-msg91-otp-v2] Widget verify response:', JSON.stringify(widgetVerifyData))

        const msgLower = (widgetVerifyData.message ?? '').toString().toLowerCase()
        if (
          widgetVerifyData.type === 'success' ||
          widgetVerifyData.status === 'success' ||
          widgetVerifyData.token ||
          widgetVerifyData['access-token'] ||
          msgLower.includes('verified') ||
          msgLower.includes('matched') ||
          msgLower.includes('success')
        ) {
          isVerified = true
        } else if (widgetVerifyData.message) {
          lastErrorMsg = widgetVerifyData.message
        }
      } catch (e) {
        console.warn('[verify-msg91-otp-v2] Widget verify error:', e)
      }
    }

    // ── 3. Fallback: Standard MSG91 v5 OTP Verify API ─────────────────────
    if (!isVerified) {
      const verifyRes = await fetch(
        `https://control.msg91.com/api/v5/otp/verify?mobile=${formattedMobile}&otp=${enteredOtp}`,
        {
          method: 'GET',
          headers: {
            authkey: authKey,
          },
        }
      )

      const verifyData = await verifyRes.json()
      console.log('[verify-msg91-otp-v2] Standard verify response:', JSON.stringify(verifyData))

      const msgLower = (verifyData.message ?? '').toString().toLowerCase()
      if (
        verifyData.type === 'success' ||
        verifyData.status === 'success' ||
        msgLower.includes('verified') ||
        msgLower.includes('matched') ||
        msgLower.includes('success')
      ) {
        isVerified = true
      } else if (verifyData.message) {
        lastErrorMsg = verifyData.message
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, error: lastErrorMsg },
        { status: 400 }
      )
    }

    // ── 4. Supabase Profile Lookup & Auto-Detection ────────────────────────
    const profile = await lookupProfile(digits, fullPhone, fallbackUserId)
    const role = profile?.role ?? null
    const isNewUser = !profile || !profile.role || profile.role === ''

    console.log(`[verify-msg91-otp-v2] Verification success for ${fullPhone}. Registered: ${!isNewUser}, Role: ${role}`)

    return NextResponse.json({
      success: true,
      userId: profile?.id ?? fallbackUserId,
      role: role,
      isNewUser: isNewUser,
      name: profile?.name ?? null,
      phone: fullPhone,
      selectedRole,
      testMode: false,
    })

  } catch (err: any) {
    console.error('[verify-msg91-otp-v2] Unexpected exception:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function lookupProfile(
  rawDigits: string,
  fullPhone: string,
  fallbackUserId: string
): Promise<{ id: string; role: string | null; name?: string } | null> {
  try {
    const admin = createAdminClient()
    const digits = rawDigits.slice(-10)

    const phoneVariants = [
      fullPhone,          // +919876543210
      digits,             // 9876543210
      `91${digits}`,      // 919876543210
      `+91 ${digits}`,    // +91 9876543210
    ]

    // 1. Search profiles table by phone variants
    for (const pVariant of phoneVariants) {
      const { data: byPhone } = await admin
        .from('profiles')
        .select('id, role, name')
        .eq('phone', pVariant)
        .maybeSingle()
      if (byPhone && byPhone.role && byPhone.role !== '') {
        console.log(`[lookupProfile] Found profile by phone variant "${pVariant}":`, byPhone)
        return { id: byPhone.id, role: byPhone.role, name: byPhone.name }
      }
    }

    // 2. Search profiles table by ilike/contains
    const { data: ilikeProfiles } = await admin
      .from('profiles')
      .select('id, role, name, phone')
      .ilike('phone', `%${digits}%`)
      .limit(5)

    if (ilikeProfiles && ilikeProfiles.length > 0) {
      for (const p of ilikeProfiles) {
        if (p.role && p.role !== '') {
          console.log(`[lookupProfile] Found profile by ilike phone "${digits}":`, p)
          return { id: p.id, role: p.role, name: p.name }
        }
      }
    }

    // 3. Search profiles table by fallback ID
    const { data: byId } = await admin
      .from('profiles')
      .select('id, role, name')
      .eq('id', fallbackUserId)
      .maybeSingle()
    if (byId && byId.role && byId.role !== '') {
      console.log(`[lookupProfile] Found profile by fallback ID:`, byId)
      return { id: byId.id, role: byId.role, name: byId.name }
    }

    // 4. Search customers table by phone
    for (const pVariant of phoneVariants) {
      const { data: cust } = await admin
        .from('customers')
        .select('user_id, name')
        .eq('phone', pVariant)
        .maybeSingle()
      if (cust?.user_id) {
        console.log(`[lookupProfile] Found customer by phone variant "${pVariant}":`, cust)
        return { id: cust.user_id, role: 'customer', name: cust.name }
      }
    }

    // 5. Search suppliers table by phone
    for (const pVariant of phoneVariants) {
      const { data: sup } = await admin
        .from('suppliers')
        .select('user_id, business_name')
        .eq('phone', pVariant)
        .maybeSingle()
      if (sup?.user_id) {
        console.log(`[lookupProfile] Found supplier by phone variant "${pVariant}":`, sup)
        return { id: sup.user_id, role: 'supplier', name: sup.business_name }
      }
    }

    // 6. Search profiles table by dummy email
    const dummyEmail = `test_91${digits}@jalseva.demo`
    const { data: byEmail } = await admin
      .from('profiles')
      .select('id, role, name')
      .eq('email', dummyEmail)
      .maybeSingle()
    if (byEmail && byEmail.role && byEmail.role !== '') {
      console.log(`[lookupProfile] Found profile by dummy email:`, byEmail)
      return { id: byEmail.id, role: byEmail.role, name: byEmail.name }
    }

    console.log(`[lookupProfile] No existing registered profile found for phone digits: ${digits}`)
    return null
  } catch (err) {
    console.error('[lookupProfile] Profile lookup error:', err)
    return null
  }
}
