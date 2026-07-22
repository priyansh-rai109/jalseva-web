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
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
