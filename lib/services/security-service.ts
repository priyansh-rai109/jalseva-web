import crypto from 'crypto'

const AUTH_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'jalseva-production-super-secret-pepper-key-2026'

// ── 1. Rate Limiting (In-Memory sliding window) ──────────────────────────────
interface RateLimitEntry {
  attempts: number
  lockedUntil?: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function checkRateLimit(identifier: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry) {
    return { allowed: true, remaining: maxAttempts }
  }

  // If locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil }
  }

  // Reset if lock expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    rateLimitMap.delete(identifier)
    return { allowed: true, remaining: maxAttempts }
  }

  if (entry.attempts >= maxAttempts) {
    entry.lockedUntil = now + lockDurationMs
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil }
  }

  return { allowed: true, remaining: maxAttempts - entry.attempts }
}

export function recordFailedAttempt(identifier: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier) || { attempts: 0 }
  entry.attempts += 1

  if (entry.attempts >= maxAttempts) {
    entry.lockedUntil = now + lockDurationMs
  }

  rateLimitMap.set(identifier, entry)
}

export function resetRateLimit(identifier: string) {
  rateLimitMap.delete(identifier)
}

// ── 2. Cryptographic Salted Hashing with Timing-Safe Verification ───────────
export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(pin, `${userSalt}:${AUTH_SECRET}`, 10000, 32, 'sha256').toString('hex')
  return { hash, salt: userSalt }
}

export function verifyPinHash(enteredPin: string, storedHash: string, salt: string): boolean {
  try {
    const { hash } = hashPin(enteredPin, salt)
    const bufA = Buffer.from(hash, 'hex')
    const bufB = Buffer.from(storedHash, 'hex')

    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

// ── 3. HMAC-SHA256 Signed Session Token Management ─────────────────────────
export interface SessionPayload {
  id: string
  role: 'customer' | 'supplier' | 'super_admin'
  phone?: string
  email?: string
  name: string
  iat: number
  exp: number
}

export function signSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, maxAgeSeconds = 86400 * 7): string {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + maxAgeSeconds,
  }

  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url')

  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    if (!token || !token.includes('.')) return null
    const [encodedPayload, signature] = token.split('.')

    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url')

    const bufA = Buffer.from(signature)
    const bufB = Buffer.from(expectedSignature)

    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      console.warn('[SecurityService] Invalid session signature detected!')
      return null
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.warn('[SecurityService] Session token expired')
      return null
    }

    return payload
  } catch (err) {
    console.warn('[SecurityService] Failed to verify session token:', err)
    return null
  }
}
