/**
 * Utility to convert raw technical errors into simple, friendly Hinglish error messages
 * while preserving full technical details in browser/server console.error for debugging.
 */

export const SUPPORT_WHATSAPP_URL = 'https://wa.me/919876543210?text=Hi%20JalSeva%20Support%2C%20mujhe%20help%20chahiye'

export function getFriendlyErrorMessage(err: any, fallbackContext: string = 'generic'): string {
  console.error(`[JalSeva Log] Raw Error (${fallbackContext}):`, err)

  const rawMessage = (typeof err === 'string' ? err : err?.message || err?.error || '').toLowerCase()

  if (rawMessage.includes('invalid 10-digit') || rawMessage.includes('phone number') || rawMessage.includes('digits')) {
    return 'Sahi 10-digit mobile number daalo'
  }

  if (rawMessage.includes('otp') || rawMessage.includes('invalid request') || rawMessage.includes('verification failed')) {
    return 'Galat OTP daala hai, sahi 6-digit OTP check karke daalo'
  }

  if (rawMessage.includes('access denied') || rawMessage.includes('unauthorized') || rawMessage.includes('forbidden')) {
    return 'Login mein problem hui, dobara try karo'
  }

  if (rawMessage.includes('network') || rawMessage.includes('fetch') || rawMessage.includes('failed to fetch') || rawMessage.includes('500') || rawMessage.includes('server')) {
    return 'Kuch problem ho gayi. Dobara try karo ya humein WhatsApp par contact karo.'
  }

  if (fallbackContext === 'auth') {
    return 'Login mein problem hui, dobara try karo'
  }

  if (fallbackContext === 'order') {
    return 'Order place karne mein problem hui, dobara try karo'
  }

  return 'Kuch problem ho gayi. Dobara try karo ya humein call/WhatsApp karo.'
}
