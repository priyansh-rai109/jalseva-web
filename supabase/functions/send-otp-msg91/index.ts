import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Types for Supabase Custom SMS Hook payload
interface WebhookPayload {
  user: {
    id: string
    phone: string
  }
  sms: {
    otp: string
  }
}

serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const payload: WebhookPayload = await req.json()
    console.log(`[MSG91] Intercepted OTP request for phone: ${payload.user.phone}`)

    const phone = payload.user.phone
    const otp = payload.sms.otp

    // Strip the '+' sign from the phone number as MSG91 expects it without '+' (e.g., 919876543210)
    const formattedPhone = phone.replace('+', '')

    // Read MSG91 Credentials from Environment Variables
    const authKey = Deno.env.get('MSG91_AUTH_KEY')
    const templateId = Deno.env.get('MSG91_TEMPLATE_ID')

    if (!authKey || !templateId) {
      console.error('[MSG91] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID in environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing SMS credentials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Call MSG91 SendOTP API
    // Documentation: https://docs.msg91.com/p/tf9Gtextn/e/7WESqZQUR/MSG91
    const url = new URL('https://control.msg91.com/api/v5/otp')
    url.searchParams.append('template_id', templateId)
    url.searchParams.append('mobile', formattedPhone)
    url.searchParams.append('authkey', authKey)
    url.searchParams.append('otp', otp)

    console.log(`[MSG91] Calling MSG91 API for mobile: ${formattedPhone}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    const data = await response.json()
    console.log('[MSG91] API Response:', data)

    // MSG91 typically returns type "success" or "error"
    if (data.type === 'error') {
      console.error('[MSG91] Failed to send OTP:', data.message)
      return new Response(
        JSON.stringify({ error: `MSG91 Error: ${data.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Successfully sent OTP
    return new Response(
      JSON.stringify({ success: true, message: 'OTP sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[MSG91] Exception in Send OTP hook:', err)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
