import type { Metadata } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable} dark`}>
      <body className="font-sans min-h-screen bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
