'use client'

import React from 'react'
import Link from 'next/link'
import { Droplets, Heart, Phone, Sparkles, ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useShortlist } from '@/lib/context/ShortlistContext'
import { LanguageToggle } from '@/components/shared/LanguageToggle'

const ADMIN_PHONE_NUMBER =
  process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER || '+919166759989'

export function CustomPrintsNav({ showBackButton = false }: { showBackButton?: boolean }) {
  const { count, openDrawer } = useShortlist()

  return (
    <nav className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Back link */}
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Link
                href="/custom-prints"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mr-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Catalog</span>
              </Link>
            )}

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl water-shimmer flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <span className="gradient-text">Jal</span>
                <span className="text-foreground">Seva</span>
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-medium">
              <Sparkles className="w-3 h-3" />
              Custom Bottle Printing
            </span>
          </div>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <Link href="/custom-prints" className="text-foreground hover:text-sky-400 transition-colors">
              Design Catalog
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <span>Water Delivery</span>
            </Link>
            <Link href="/corporate" className="hover:text-foreground transition-colors flex items-center gap-1">
              <span>B2B Supply</span>
            </Link>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Shortlist button in navbar */}
            <Button
              variant="outline"
              size="sm"
              onClick={openDrawer}
              className="relative border-border text-xs flex items-center gap-1.5 h-8 px-2.5 sm:px-3 bg-card/60 hover:bg-card"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  count > 0 ? 'text-rose-400 fill-rose-400' : 'text-muted-foreground'
                }`}
              />
              <span className="hidden sm:inline">Shortlist</span>
              {count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              )}
            </Button>

            {/* Quick Call CTA */}
            <a
              href={`tel:${ADMIN_PHONE_NUMBER}`}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>{ADMIN_PHONE_NUMBER}</span>
            </a>

            <LanguageToggle variant="compact" />

            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
