import { NextRequest, NextResponse } from 'next/server'

const DEMO_NUMBERS = ['9876543210', '9876543211']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone: rawPhone } = body

    const isDevelopment = process.env.NODE_ENV === 'development'
    const digits = rawPhone?.replace(/\D/g, '') ?? ''

    if (!digits || digits.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid 10-digit mobile number' },
        { status: 400 }
      )
    }

    // ── 1. Dev Demo Bypass ────────────────────────────────────────────────
    if (isDevelopment && DEMO_NUMBERS.includes(digits)) {
      console.log('[send-msg91-otp] Demo number bypass:', digits)
      return NextResponse.json({
        success: true,
        message: 'Demo mode OTP sent (use 123456)',
        testMode: true,
      })
    }

    const authKey = process.env.MSG91_AUTHKEY || '554916AwikHphHxfS46a699c83P1'
    const widgetId = process.env.MSG91_WIDGET_ID || '366743666e48353835303736'

    if (!authKey) {
      console.error('[send-msg91-otp] MSG91_AUTHKEY is missing')
      return NextResponse.json(
        { success: false, error: 'SMS service configuration missing' },
        { status: 500 }
      )
    }

    const formattedMobile = `91${digits}`
    console.log('[send-msg91-otp] Requesting OTP send for:', formattedMobile)

    // ── 2. Widget Send OTP API (uses OTP Widget ₹50 wallet balance) ─────────
    if (widgetId) {
      try {
        const widgetRes = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
          body: JSON.stringify({
            widgetId: widgetId.trim(),
            identifier: formattedMobile,
          }),
        })

        const widgetData = await widgetRes.json()
        console.log('[send-msg91-otp] Widget API response:', widgetData)

        if (widgetData.type === 'success' || widgetData.status === 'success') {
          const reqId = typeof widgetData.message === 'string'
            ? widgetData.message
            : (widgetData.message?.reqId || widgetData.reqId || null)

          return NextResponse.json({
            success: true,
            requestId: reqId,
            message: 'OTP sent successfully via SMS',
          })
        }

        if (widgetData.message?.toLowerCase().includes('captcha')) {
          console.warn('[send-msg91-otp] Captcha enabled on widget. Falling back to standard OTP API.')
        } else if (widgetData.type === 'error') {
          return NextResponse.json(
            { success: false, error: widgetData.message || 'Widget OTP send failed' },
            { status: 400 }
          )
        }
      } catch (e) {
        console.warn('[send-msg91-otp] Widget sendOtp error, attempting standard OTP API:', e)
      }
    }

    // ── 3. Fallback: Standard MSG91 v5 OTP API ────────────────────────────
    const otpRes = await fetch(`https://control.msg91.com/api/v5/otp?mobile=${formattedMobile}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
    })

    const otpData = await otpRes.json()
    console.log('[send-msg91-otp] Standard OTP API response:', otpData)

    if (otpData.type === 'error' || otpData.status === 'fail') {
      return NextResponse.json(
        { success: false, error: otpData.message || 'Failed to send OTP via SMS' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      requestId: otpData.request_id || null,
      message: 'OTP sent successfully via SMS',
    })

  } catch (err: any) {
    console.error('[send-msg91-otp] Unexpected exception:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
