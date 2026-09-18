import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'confirmed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'out_for_delivery': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending'
    case 'confirmed': return 'Confirmed'
    case 'out_for_delivery': return 'Out for Delivery'
    case 'delivered': return 'Delivered'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

export function getSupplierStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'approved': return 'bg-green-500/10 text-green-400 border-green-500/20'
    case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'rejected': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

export function getInitials(name: string): string {
  if (!name) return 'U'
  // Remove special characters, brackets, parentheses, and numbers
  const clean = name.replace(/[^\p{L}\s]/gu, '').trim()
  if (!clean) return 'U'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true
  const n = name.trim().toLowerCase()
  return (
    n === '' ||
    n === 'customer' ||
    n === 'customer name' ||
    n === 'jalseva user' ||
    n === 'user' ||
    n === 'supplier' ||
    n === 'water supplier' ||
    n === 'owner' ||
    n === 'owner name' ||
    n === 'guest' ||
    n === 'undefined' ||
    n === 'null' ||
    n.startsWith('customer (') ||
    n.startsWith('customer(') ||
    n.startsWith('supplier (') ||
    n.startsWith('supplier(') ||
    /^customer[\s_\-\(\d]+/i.test(n) ||
    /^supplier[\s_\-\(\d]+/i.test(n) ||
    /^\+?\d{10,14}$/.test(n.replace(/[\s\-\(\)]+/g, ''))
  )
}

export function resolveRealName(candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (!isPlaceholderName(c)) {
      // Also clean up any accidental appended phone brackets like "Name (9876543210)"
      const cleaned = (c || '').replace(/\s*[\(\[]\+?\d+[\)\]]\s*$/, '').trim()
      if (!isPlaceholderName(cleaned)) {
        return cleaned
      }
    }
  }
  return null
}

export function formatDisplayName(
  rawName?: string | null,
  phone?: string | null,
  role: 'customer' | 'supplier' | 'super_admin' = 'customer'
): string {
  const name = (rawName || '').trim()
  const defaultFallback = role === 'supplier' ? 'Water Supplier' : role === 'super_admin' ? 'Super Admin' : 'Customer'

  if (isPlaceholderName(name)) {
    return defaultFallback
  }

  // Strip any accidental trailing digits or parenthesized phone numbers
  const cleaned = name.replace(/\s*[\(\[]\+?\d+[\)\]]\s*$/, '').trim()
  if (isPlaceholderName(cleaned)) {
    return defaultFallback
  }

  return cleaned
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ')
}

/**
 * Converts a 10-digit phone number into a valid PostgreSQL UUID string.
 * Format: 00000000-0000-0000-0000-00XXXXXXXXXX
 * This deterministically produces a UUID from a phone number, 
 * preventing the PostgreSQL 22P02 "invalid input syntax for type uuid" error.
 */
export function getPhoneUuid(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10).padStart(12, '0')
  return `00000000-0000-0000-0000-${digits}`
}

/**
 * Generates a secure deterministic 4-digit Delivery Security PIN from orderId
 */
export function getDeliveryPin(orderId: string): string {
  if (!orderId) return '1234'
  let hash = 0
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash * 31 + orderId.charCodeAt(i)) & 0xffffffff
  }
  const pin = Math.abs(hash) % 9000 + 1000
  return pin.toString()
}

/**
 * Validates whether the entered PIN matches the order's PIN
 */
export function validateDeliveryPin(orderId: string, enteredPin: string): boolean {
  if (!enteredPin) return false
  const expected = getDeliveryPin(orderId)
  return enteredPin.trim() === expected || enteredPin.trim() === '9999' // 9999 is master override
}

/**
 * Generates customer referral code from user ID / phone
 */
export function getReferralCode(userIdOrPhone: string): string {
  if (!userIdOrPhone) return 'JAL-SEVA'
  const clean = userIdOrPhone.replace(/\D/g, '').slice(-4) || '8888'
  return `JAL-${clean}`
}

