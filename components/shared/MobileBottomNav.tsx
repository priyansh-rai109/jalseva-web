'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  FileText,
  User,
  Package,
  Star,
  Settings,
  MapPin,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { type TranslationKey } from '@/lib/i18n/translations'
import type { UserRole } from '@/types'

interface MobileBottomNavProps {
  role: UserRole
  notificationCount?: number
}

interface NavItem {
  href: string
  labelKey: TranslationKey
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const cartItemCount = useCartStore((state) => state.getTotalItems())

  const customerItems: NavItem[] = [
    { href: '/customer/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
    { href: '/customer/browse', labelKey: 'navBrowse', icon: Building2 },
    { href: '/customer/cart', labelKey: 'navCart', icon: ShoppingCart, badge: cartItemCount },
    { href: '/customer/orders', labelKey: 'navOrders', icon: FileText },
    { href: '/customer/profile', labelKey: 'navProfile', icon: User },
  ]

  const supplierItems: NavItem[] = [
    { href: '/supplier/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
    { href: '/supplier/orders', labelKey: 'navOrders', icon: ShoppingCart },
    { href: '/supplier/products', labelKey: 'navProducts', icon: Package },
    { href: '/supplier/reviews', labelKey: 'navReviews', icon: Star },
    { href: '/supplier/profile', labelKey: 'navProfile', icon: Settings },
  ]

  const adminItems: NavItem[] = [
    { href: '/admin/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
    { href: '/admin/suppliers', labelKey: 'navSuppliers', icon: Building2 },
    { href: '/admin/orders', labelKey: 'navOrders', icon: ShoppingCart },
    { href: '/admin/analytics', labelKey: 'navAnalytics', icon: BarChart3 },
    { href: '/admin/settings', labelKey: 'navSettings', icon: Settings },
  ]

  const items = role === 'super_admin' ? adminItems : role === 'supplier' ? supplierItems : customerItems

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-2">
      <nav className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role}/dashboard` && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 relative select-none min-h-[48px]',
                isActive ? 'text-sky-400 font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active glow pill */}
              {isActive && (
                <div className="absolute -top-1.5 w-8 h-1 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)] animate-in fade-in zoom-in-75 duration-200" />
              )}

              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />

                {/* Badge for Cart or Notifications */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 bg-sky-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
