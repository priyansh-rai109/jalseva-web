import type { Metadata, Viewport } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#030712',
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'JalSeva — Water Delivery Marketplace | Jodhpur',
    template: '%s | JalSeva',
  },
  description:
    'JalSeva connects you with trusted water suppliers in Jodhpur, Rajasthan. Order tankers, 20L cans, and RO water delivered to your doorstep.',
  keywords: ['water delivery', 'Jodhpur', 'Rajasthan', 'tanker', 'water supplier', 'JalSeva'],
  authors: [{ name: 'JalSeva' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'JalSeva',
    title: 'JalSeva — Water Delivery Marketplace | Jodhpur',
    description: 'Order water from trusted suppliers in Jodhpur, Rajasthan.',
  },
}

import { Suspense } from 'react'
import { SessionToastHandler } from '@/components/SessionToastHandler'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { WaterBackgroundCanvas } from '@/components/animation/WaterBackgroundCanvas'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable} dark`}>
      <body className="font-sans min-h-screen bg-background text-foreground relative">
        <LanguageProvider>
          <WaterBackgroundCanvas />
          <div className="relative z-10">{children}</div>
          <Toaster richColors position="top-center" />
          <Suspense fallback={null}>
            <SessionToastHandler />
          </Suspense>
        </LanguageProvider>
      </body>
    </html>
  )
}
