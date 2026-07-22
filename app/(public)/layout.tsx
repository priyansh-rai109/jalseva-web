import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JalSeva — Water Delivery Marketplace | Jodhpur, Rajasthan',
  description:
    'Order water tankers, 20L cans, and RO pouches from trusted suppliers in Jodhpur. Fast delivery, verified suppliers, real-time tracking.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
