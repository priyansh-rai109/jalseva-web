import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

export interface InvoiceData {
  orderId: string
  invoiceNumber: string
  orderDate: string
  deliveryDate?: string
  paymentMethod: string
  paymentStatus: string
  customerName: string
  customerPhone?: string
  customerAddress: string
  customerGstin?: string
  supplierName: string
  supplierPhone?: string
  supplierAddress?: string
  supplierGstin?: string
  supplierFssai?: string
  items: {
    name: string
    hsnCode: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  deliveryFee: number
  expressFee: number
  discount: number
  taxRate: number // e.g. 0.05 for 5% GST or 0 for basic water
  taxAmount: number
  grandTotal: number
  purityGrade?: string
}

export function generateInvoiceNumber(orderId: string): string {
  const prefix = 'JS'
  const year = new Date().getFullYear().toString().slice(-2)
  const shortId = orderId.replace(/\D/g, '').slice(-4) || '1001'
  return `${prefix}-${year}-${shortId}`
}
