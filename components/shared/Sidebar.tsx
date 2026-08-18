'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/stores/cart-store'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { type TranslationKey } from '@/lib/i18n/translations'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import {
  Droplets,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Bell,
  Star,
  MapPin,
  BarChart3,
  Building2,
  FileText,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MobileBottomNav } from '@/components/shared/MobileBottomNav'

interface NavItemConfig {
  href: string
  labelKey: TranslationKey
  icon: any
}

// ─── Nav configs per role ──────────────────────────────────────────────────
const adminNav: NavItemConfig[] = [
  { href: '/admin/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
  { href: '/admin/suppliers', labelKey: 'navSuppliers', icon: Building2 },
  { href: '/admin/customers', labelKey: 'navProfile', icon: Users },
  { href: '/admin/orders', labelKey: 'navOrders', icon: ShoppingCart },
  { href: '/admin/zones', labelKey: 'navZones', icon: MapPin },
  { href: '/admin/analytics', labelKey: 'navAnalytics', icon: BarChart3 },
  { href: '/admin/settings', labelKey: 'navSettings', icon: Settings },
]

const supplierNav: NavItemConfig[] = [
  { href: '/supplier/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
  { href: '/supplier/orders', labelKey: 'navOrders', icon: ShoppingCart },
  { href: '/supplier/notifications', labelKey: 'navNotifications', icon: Bell },
  { href: '/supplier/products', labelKey: 'navProducts', icon: Package },
  { href: '/supplier/reviews', labelKey: 'navReviews', icon: Star },
  { href: '/supplier/zone', labelKey: 'navZones', icon: MapPin },
  { href: '/supplier/analytics', labelKey: 'navAnalytics', icon: BarChart3 },
  { href: '/supplier/profile', labelKey: 'navProfile', icon: Settings },
]

const customerNav: NavItemConfig[] = [
  { href: '/customer/dashboard', labelKey: 'navHome', icon: LayoutDashboard },
  { href: '/customer/browse', labelKey: 'navBrowse', icon: Building2 },
  { href: '/customer/subscriptions', labelKey: 'navSubscriptions', icon: RefreshCw },
  { href: '/customer/orders', labelKey: 'navOrders', icon: FileText },
  { href: '/customer/notifications', labelKey: 'navNotifications', icon: Bell },
  { href: '/customer/profile', labelKey: 'navProfile', icon: Settings },
]

interface SidebarProps {
  role: UserRole
  userName: string
  userEmail?: string
  notificationCount?: number
}

export function Sidebar({ role, userName, userEmail, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const { t, language } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = role === 'super_admin' ? adminNav : role === 'supplier' ? supplierNav : customerNav

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'supplier' ? (language === 'hi' ? 'सप्लायर' : 'Supplier') : (language === 'hi' ? 'ग्राहक' : 'Customer')
  const roleColor = role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' : role === 'supplier' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      useCartStore.getState().clearCart()
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      await supabase.auth.signOut()
      toast.success(language === 'hi' ? 'सफलतापूर्वक लॉग आउट हो गया' : 'Signed out successfully')
    } catch (err) {
      console.error('Error during sign out:', err)
    } finally {
      setLoggingOut(false)
      window.location.href = '/login'
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-xl water-shimmer flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300">
            <Droplets className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="gradient-text">Jal</span>
            <span className="text-foreground">Seva</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-secondary">
            <AvatarFallback className="bg-sky-500/20 text-sky-400 text-sm font-semibold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>
        <div className="mt-2">
          <Badge className={cn('text-xs px-2 py-0.5', roleColor)}>{roleLabel}</Badge>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const labelText = t(item.labelKey)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group min-h-[44px]',
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 pl-[10px]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-sky-400' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1">{labelText}</span>
              {item.labelKey === 'navNotifications' && notificationCount > 0 && (
                <Badge className="bg-sky-500 text-white text-xs h-5 px-1.5">{notificationCount}</Badge>
              )}
              {isActive && <ChevronRight className="w-4 h-4 text-sky-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Language Toggle & Sign out */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="px-1">
          <LanguageToggle className="w-full justify-center" />
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 min-h-[40px]"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title={language === 'hi' ? 'लॉग आउट पुष्टि' : 'Logout Confirmation'}
        message={language === 'hi' ? 'क्या आप वाकई JalSeva से लॉग आउट करना चाहते हैं?' : 'Are you sure you want to sign out from JalSeva?'}
        confirmText={language === 'hi' ? 'हाँ, लॉग आउट करें' : 'Yes, Sign Out'}
        cancelText={language === 'hi' ? 'नहीं, वापस जाएं' : 'Cancel'}
        variant="destructive"
        loading={loggingOut}
        onConfirm={handleSignOut}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-30 w-full shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 focus:outline-none min-h-[40px] min-w-[40px] flex items-center justify-center border border-border"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg water-shimmer flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle variant="compact" />
          {notificationCount > 0 && (
            <Link
              href={role === 'customer' ? '/customer/notifications' : role === 'supplier' ? '/supplier/notifications' : '/admin/dashboard'}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 bg-sky-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            </Link>
          )}
          <Badge className={cn('text-[11px] px-2 py-0.5 font-medium', roleColor)}>{roleLabel}</Badge>
        </div>
      </div>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-card h-full shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col min-h-screen bg-card border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav role={role} notificationCount={notificationCount} />
    </>
  )
}
