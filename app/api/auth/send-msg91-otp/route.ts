import { NextRequest, NextResponse } from 'next/server'

const DEMO_NUMBERS = ['9876543210', '9876543211']
const DEFAULT_AUTH_KEY = '554916AwikHphHxfS46a699c83P1'
const DEFAULT_WIDGET_ID = '366743666e48353835303736'
const DEFAULT_TEMPLATE_ID = '6a69a7bfd7f04edf290d3915'

function cleanStr(val: string | undefined, fallback: string): string {
  if (!val) return fallback
  const cleaned = val.replace(/['"]/g, '').trim()
  return cleaned !== '' ? cleaned : fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone: rawPhone } = body

    const isDevelopment = process.env.NODE_ENV === 'development'
    const digits = rawPhone?.replace(/\D/g, '').slice(-10) ?? ''

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

    const authKey = cleanStr(process.env.MSG91_AUTHKEY, DEFAULT_AUTH_KEY)
    const widgetId = cleanStr(process.env.MSG91_WIDGET_ID, DEFAULT_WIDGET_ID)
    const templateId = cleanStr(process.env.MSG91_TEMPLATE_ID, DEFAULT_TEMPLATE_ID)

    const formattedMobile = `91${digits}`
    console.log('[send-msg91-otp] Requesting OTP send for:', formattedMobile)

    // ── 2. Method 1: Widget Send OTP API ──────────────────────────────────
    if (widgetId) {
      try {
        const widgetRes = await fetch('https://control.msg91.com/api/v5/widget/sendOtp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: authKey,
          },
          body: JSON.stringify({
            widgetId: widgetId,
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
        console.warn('[send-msg91-otp] Widget API failed, trying Standard OTP API fallback. Widget error:', widgetData)
      } catch (e) {
        console.warn('[send-msg91-otp] Widget API exception, falling back:', e)
      }
    }

    // ── 3. Method 2 Fallback: Standard MSG91 v5 OTP API with Template ID ───
    const otpApiUrl = templateId
      ? `https://control.msg91.com/api/v5/otp?mobile=${formattedMobile}&template_id=${templateId}`
      : `https://control.msg91.com/api/v5/otp?mobile=${formattedMobile}`

    const otpRes = await fetch(otpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
    })

    const otpData = await otpRes.json()
    console.log('[send-msg91-otp] Standard OTP API response:', otpData)

    if (otpData.type === 'success' || otpData.status === 'success' || otpData.request_id) {
      return NextResponse.json({
        success: true,
        requestId: otpData.request_id || null,
        message: 'OTP sent successfully via SMS',
      })
    }

    return NextResponse.json(
      { success: false, error: otpData.message || 'Failed to send OTP via SMS. Please check mobile number.' },
      { status: 400 }
    )

  } catch (err: any) {
    console.error('[send-msg91-otp] Unexpected exception:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
