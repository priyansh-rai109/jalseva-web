'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
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
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types'

// ─── Nav configs per role ──────────────────────────────────────────────────
const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/orders', label: 'All Orders', icon: ShoppingCart },
  { href: '/admin/zones', label: 'Zones', icon: MapPin },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const supplierNav = [
  { href: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/supplier/products', label: 'Products', icon: Package },
  { href: '/supplier/reviews', label: 'Reviews', icon: Star },
  { href: '/supplier/zone', label: 'Delivery Zone', icon: MapPin },
  { href: '/supplier/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/supplier/profile', label: 'Profile', icon: Settings },
]

const customerNav = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customer/browse', label: 'Browse Suppliers', icon: Building2 },
  { href: '/customer/orders', label: 'My Orders', icon: FileText },
  { href: '/customer/notifications', label: 'Notifications', icon: Bell },
  { href: '/customer/profile', label: 'Profile', icon: Settings },
]

interface SidebarProps {
  role: UserRole
  userName: string
  userEmail?: string
  notificationCount?: number
}

export function Sidebar({ role, userName, userEmail, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = role === 'super_admin' ? adminNav : role === 'supplier' ? supplierNav : customerNav

  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'supplier' ? 'Supplier' : 'Customer'
  const roleColor = role === 'super_admin' ? 'bg-purple-500/10 text-purple-400' : role === 'supplier' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card">
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg water-shimmer flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="gradient-text">Jal</span>
            <span className="text-foreground">Seva</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded-lg text-muted-foreground hover:text-foreground"
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
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group min-h-[44px]',
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 pl-[10px]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-sky-400' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Notifications' && notificationCount > 0 && (
                <Badge className="bg-sky-500 text-white text-xs h-5 px-1.5">{notificationCount}</Badge>
              )}
              {isActive && <ChevronRight className="w-4 h-4 text-sky-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 min-h-[44px]"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
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
          <Badge className={cn('text-xs px-2 py-0.5', roleColor)}>{roleLabel}</Badge>
        </div>
      </div>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-card h-full shadow-2xl z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col min-h-screen bg-card border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}

