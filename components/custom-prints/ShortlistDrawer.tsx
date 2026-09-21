'use client'

import React from 'react'
import Link from 'next/link'
import {
  Heart,
  X,
  Trash2,
  MessageSquare,
  Phone,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useShortlist } from '@/lib/context/ShortlistContext'

const ADMIN_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '919166759989'
const ADMIN_PHONE_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '+919166759989'

export function ShortlistDrawer() {
  const { shortlist, count, removeFromShortlist, clearShortlist, isOpen, setIsOpen, closeDrawer } =
    useShortlist()

  if (count === 0 && !isOpen) return null

  // Build combined WhatsApp inquiry text for all shortlisted items
  const handleBulkWhatsApp = () => {
    if (shortlist.length === 0) return

    const itemList = shortlist
      .map(
        (item, index) =>
          `${index + 1}. *${item.design_code}* - ${item.title} (${item.occasion_category})`
      )
      .join('\n')

    const message =
      `👋 *Hi JalSeva Team!*\n\n` +
      `I am interested in the following shortlisted bottle designs for custom printing:\n\n` +
      `${itemList}\n\n` +
      `Could you please share the pricing, minimum order quantities, and availability for these designs?`

    const url = `https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
      message
    )}`

    window.open(url, '_blank')
  }

  return (
    <>
      {/* ─── Floating Trigger Button ─────────────────────────────────────── */}
      {count > 0 && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-full shadow-2xl shadow-sky-500/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 group"
          aria-label="View Shortlist"
        >
          <div className="relative">
            <Heart className="w-5 h-5 fill-rose-400 text-rose-400 animate-pulse" />
            <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
              {count}
            </span>
          </div>
          <span className="text-sm font-medium pr-1">Shortlist ({count})</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* ─── Drawer Modal / Backdrop ─────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeDrawer}
          />

          {/* Drawer Content */}
          <div className="relative z-50 w-full max-w-md bg-card/95 backdrop-blur-xl border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-sky-400 fill-sky-400/30" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-base">
                    Shortlisted Designs
                    <Badge variant="secondary" className="text-xs bg-sky-500/15 text-sky-400">
                      {count}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Selected for personalized consultation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {count > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearShortlist}
                    className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* List of shortlisted items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {count === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <Heart className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Your shortlist is empty</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                      Click the heart button on any design card to save it here for a combined inquiry.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeDrawer}
                    className="text-xs mt-2"
                  >
                    Explore Designs
                  </Button>
                </div>
              ) : (
                shortlist.map((item) => (
                  <div
                    key={item.design_code}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/80 hover:border-sky-500/40 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative border border-border/50">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No Photo
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-bold bg-sky-500/10 text-sky-400 border-sky-500/30 px-1.5 py-0"
                        >
                          {item.design_code}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {item.occasion_category}
                        </span>
                      </div>
                      <h4 className="font-medium text-xs text-foreground truncate">{item.title}</h4>
                      <Link
                        href={`/custom-prints/${encodeURIComponent(item.design_code)}`}
                        onClick={closeDrawer}
                        className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 mt-1"
                      >
                        View detail <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFromShortlist(item.design_code)}
                      className="text-muted-foreground hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Remove from shortlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer / CTA Actions */}
            {count > 0 && (
              <div className="p-4 border-t border-border bg-muted/40 space-y-2.5">
                <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/15 text-[11px] text-muted-foreground text-center">
                  💡 Share this list with our team on WhatsApp to receive a customized quote based on your bottle size and quantity.
                </div>

                <Button
                  onClick={handleBulkWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enquire about all {count} designs on WhatsApp
                </Button>

                <a
                  href={`tel:${ADMIN_PHONE_NUMBER}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium border border-border text-foreground hover:bg-accent transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  Call Admin: {ADMIN_PHONE_NUMBER}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
