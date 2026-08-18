import crypto from 'crypto'

// ── 0. Security Invariant: Server-Side Secret Key (Never exposed to client) ──
const AUTH_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'jalseva-production-super-secret-pepper-key-2026'

// ── 1. Sliding-Window Rate Limiting Engine ───────────────────────────────────
interface RateLimitEntry {
  attempts: number
  lockedUntil?: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  identifier: string,
  maxAttempts = 5,
  lockDurationMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  if (!entry) {
    return { allowed: true, remaining: maxAttempts }
  }

  // Check if currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: entry.lockedUntil }
  }

  // Reset entry if previous lock expired
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

export function recordFailedAttempt(
  identifier: string,
  maxAttempts = 5,
  lockDurationMs = 15 * 60 * 1000
) {
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

// ── Shared In-Memory Credential Store (Salted & Hashed) ─────────────────────
const globalCredentialStore = new Map<string, { hash: string; salt: string }>()

// Pre-seed demo accounts
const SEED_CUSTOMER = hashPin('1234')
const SEED_SUPPLIER = hashPin('1234')
globalCredentialStore.set('9876543210', SEED_CUSTOMER)
globalCredentialStore.set('9829012345', SEED_SUPPLIER)

export function setCredential(phoneDigits: string, hash: string, salt: string) {
  globalCredentialStore.set(phoneDigits, { hash, salt })
}

export function getCredential(phoneDigits: string): { hash: string; salt: string } | null {
  return globalCredentialStore.get(phoneDigits) || null
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

// ── 3. Expiring Password / PIN Reset Tokens (15-Minute Short-Lived) ──────────
interface ResetTokenEntry {
  token: string
  identifier: string
  expiresAt: number
  used: boolean
}

const resetTokenStore = new Map<string, ResetTokenEntry>()

export function generateResetToken(identifier: string, expiresInMinutes = 15): string {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000

  resetTokenStore.set(token, {
    token,
    identifier,
    expiresAt,
    used: false,
  })

  return token
}

export function verifyAndConsumeResetToken(token: string): { valid: boolean; identifier?: string; error?: string } {
  const entry = resetTokenStore.get(token)

  if (!entry) {
    return { valid: false, error: 'अमान्य या समाप्त रीसेट टोकन (Invalid reset token)' }
  }

  if (entry.used) {
    return { valid: false, error: 'यह रीसेट टोकन पहले ही उपयोग किया जा चुका है (Reset token already used)' }
  }

  if (Date.now() > entry.expiresAt) {
    resetTokenStore.delete(token)
    return { valid: false, error: 'रीसेट टोकन की समयावधि समाप्त हो चुकी है (Reset token has expired)' }
  }

  // Mark token as used immediately (Single-use token guarantee)
  entry.used = true
  resetTokenStore.set(token, entry)

  return { valid: true, identifier: entry.identifier }
}

// ── 4. Email & Phone Verification Token Management ──────────────────────────
interface VerificationEntry {
  token: string
  emailOrPhone: string
  expiresAt: number
  verified: boolean
}

const verificationStore = new Map<string, VerificationEntry>()

export function generateVerificationToken(emailOrPhone: string, expiresInHours = 24): string {
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = Date.now() + expiresInHours * 3600 * 1000

  verificationStore.set(token, {
    token,
    emailOrPhone,
    expiresAt,
    verified: false,
  })

  return token
}

export function verifyEmailOrPhoneToken(token: string): { success: boolean; emailOrPhone?: string; error?: string } {
  const entry = verificationStore.get(token)

  if (!entry) {
    return { success: false, error: 'अमान्य सत्यापन लिंक (Invalid verification token)' }
  }

  if (Date.now() > entry.expiresAt) {
    verificationStore.delete(token)
    return { success: false, error: 'सत्यापन लिंक समाप्त हो गया है (Verification token expired)' }
  }

  entry.verified = true
  verificationStore.set(token, entry)

  return { success: true, emailOrPhone: entry.emailOrPhone }
}

// ── 5. HMAC-SHA256 Signed Session Token with Strict Expiration ──────────────
export interface SessionPayload {
  id: string
  role: 'customer' | 'supplier' | 'super_admin'
  phone?: string
  email?: string
  name: string
  emailVerified?: boolean
  iat: number
  exp: number
}

export function signSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  maxAgeSeconds = 86400 * 7 // 7 Days standard session
): string {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: SessionPayload = {
    ...payload,
    emailVerified: payload.emailVerified ?? true,
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
      console.warn('[SecurityService] Invalid session signature detected! Rejecting request.')
      return null
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))

    // Strict Expiration Check
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.warn('[SecurityService] Session token expired!')
      return null
    }

    return payload
  } catch (err) {
    console.warn('[SecurityService] Failed to verify session token:', err)
    return null
  }
}
