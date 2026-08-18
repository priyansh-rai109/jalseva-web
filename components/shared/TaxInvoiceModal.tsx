'use client'

import React, { useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Printer, Download, Share2, Droplets, CheckCircle2, ShieldCheck } from 'lucide-react'
import { formatCurrency, formatDateTime, getDeliveryPin } from '@/lib/utils'
import { InvoiceData, generateInvoiceNumber } from '@/lib/services/invoice-generator'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface TaxInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
}

export function TaxInvoiceModal({ isOpen, onClose, order }: TaxInvoiceModalProps) {
  const { language } = useLanguage()
  const printRef = useRef<HTMLDivElement | null>(null)

  if (!order) return null

  const invoiceNo = generateInvoiceNumber(order.id)
  const deliveryPin = getDeliveryPin(order.id)
  const supplier = order.suppliers || {}
  const product = order.water_products || {}
  const customer = order.customers || {}

  const qty = order.quantity || 1
  const unitPrice = product.price || Math.round(order.total_amount / qty) || 70
  const subtotal = unitPrice * qty
  const deliveryFee = order.total_amount > subtotal ? order.total_amount - subtotal : 0
  const grandTotal = order.total_amount || (subtotal + deliveryFee)

  const handlePrint = () => {
    window.print()
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `💧 *JalSeva (जलसेवा) - Tax Invoice & Receipt*\n` +
      `🧾 Invoice No: ${invoiceNo}\n` +
      `📦 Order ID: #${order.id.slice(0, 8)}\n` +
      `🏢 Supplier: ${supplier.business_name || 'JalSeva Verified Plant'}\n` +
      `💧 Item: ${product.name || '20L Pure Water Jar'} (x${qty})\n` +
      `💰 Total Paid: ₹${grandTotal} (${order.payment_method?.toUpperCase() || 'COD'})\n` +
      `🛡️ Purity: TDS 85 PPM (Lab Certified)\n` +
      `📄 View Receipt: https://jalseva-web.vercel.app/customer/orders/${order.id}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Actions */}
        <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg water-shimmer flex items-center justify-center text-white">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {language === 'hi' ? 'टैक्स इनवॉइस व भुगतान रसीद' : 'Official Tax Invoice & Receipt'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Invoice #{invoiceNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="h-8 text-xs gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5 water-shimmer text-white">
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'प्रिंट / PDF' : 'Print / PDF'}</span>
            </Button>
          </div>
        </div>

        {/* Printable Invoice Area */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 text-sm text-foreground bg-background">
          {/* Company Branding & Invoice Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-black gradient-text tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  JalSeva
                </span>
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px]">
                  GST INVOICE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Digital Water Delivery Network • Jodhpur, Rajasthan</p>
              <p className="text-xs text-muted-foreground mt-0.5">HSN Code: 2201 (Packaged Drinking Water)</p>
            </div>

            <div className="text-left sm:text-right space-y-1 text-xs">
              <div className="font-mono font-bold text-foreground">INVOICE: {invoiceNo}</div>
              <div className="text-muted-foreground">Date: {formatDateTime(order.created_at || new Date().toISOString())}</div>
              <div className="text-muted-foreground">Payment: <span className="font-semibold text-foreground uppercase">{order.payment_method || 'Cash on Delivery'}</span></div>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] mt-1">
                <CheckCircle2 className="w-3 h-3 mr-1" /> PAID & DELIVERED
              </Badge>
            </div>
          </div>

          {/* Supplier & Customer 2-Column Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border pb-6 text-xs">
            <div className="space-y-1 p-3 rounded-xl bg-card border border-border">
              <div className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">SUPPLIER (PLANT)</div>
              <div className="font-semibold text-sm text-foreground">{supplier.business_name || 'JalSeva Certified Water Plant'}</div>
              <div className="text-muted-foreground">{supplier.address || 'Industrial Area, Jodhpur'}</div>
              <div className="text-muted-foreground">FSSAI Lic: <span className="font-mono text-foreground">22223074000189</span></div>
              <div className="text-muted-foreground">GSTIN: <span className="font-mono text-foreground">08AABCR1234F1Z5</span></div>
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-card border border-border">
              <div className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">BILLED TO (CUSTOMER)</div>
              <div className="font-semibold text-sm text-foreground">{customer.name || 'Customer'}</div>
              <div className="text-muted-foreground">Phone: {customer.phone || order.customer_phone || '+91 919166759989'}</div>
              <div className="text-muted-foreground">
                Address: {typeof order.delivery_address === 'object' ? `${order.delivery_address?.line1 || ''}, ${order.delivery_address?.city || 'Jodhpur'}` : String(order.delivery_address || 'Jodhpur')}
              </div>
              <div className="text-muted-foreground flex items-center gap-1">
                <span>Delivery PIN:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 rounded">{deliveryPin}</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">HSN</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-2.5 font-medium text-foreground">
                    <div>{product.name || '20L Packaged RO Drinking Water Jar'}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> TDS 85 PPM • WHO Quality Certified
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono text-muted-foreground">2201</td>
                  <td className="p-2.5 text-center font-bold text-foreground">{qty}</td>
                  <td className="p-2.5 text-right font-mono">{formatCurrency(unitPrice)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-foreground">{formatCurrency(subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Charge:</span>
                <span className="font-mono text-foreground">{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST (2.5%) + SGST (2.5%):</span>
                <span className="font-mono text-foreground">Included in MRP</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-foreground pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span className="font-mono text-sky-400 text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Purity & Water Conservation Footer */}
          <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-center space-y-1 text-xs">
            <p className="font-semibold text-sky-300">💧 “जल ही जीवन है — हर बूंद अनमोल है”</p>
            <p className="text-[11px] text-muted-foreground">
              This is a computer-generated tax invoice issued by JalSeva Marketplace on behalf of the authorized supplier.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/40 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
