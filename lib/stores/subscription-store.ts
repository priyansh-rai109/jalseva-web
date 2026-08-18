'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WaterSubscription {
  id: string
  planName: string
  productType: 'can' | 'tanker'
  frequency: 'daily' | 'alternate_days' | 'weekly'
  quantity: number
  pricePerDelivery: number
  monthlyTotal: number
  status: 'active' | 'paused' | 'cancelled'
  deliveryTimeSlot: 'morning' | 'afternoon' | 'evening'
  address: string
  startDate: string
  nextDeliveryDate: string
  deliveriesCompleted: number
  totalDeliveries: number
}

interface SubscriptionState {
  subscriptions: WaterSubscription[]
  createSubscription: (sub: Omit<WaterSubscription, 'id' | 'status' | 'deliveriesCompleted' | 'nextDeliveryDate'>) => void
  toggleStatus: (id: string) => void
  cancelSubscription: (id: string) => void
}

const DEFAULT_SUBSCRIPTION: WaterSubscription = {
  id: 'sub-jodhpur-001',
  planName: 'Family Pure RO 20L Daily Pass',
  productType: 'can',
  frequency: 'daily',
  quantity: 1,
  pricePerDelivery: 35,
  monthlyTotal: 1050,
  status: 'active',
  deliveryTimeSlot: 'morning',
  address: '14, Sardarpura B-Road, Jodhpur (342003)',
  startDate: new Date().toISOString().split('T')[0],
  nextDeliveryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
  deliveriesCompleted: 12,
  totalDeliveries: 30,
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscriptions: [DEFAULT_SUBSCRIPTION],
      createSubscription: (sub) => {
        const newSub: WaterSubscription = {
          ...sub,
          id: `sub-${crypto.randomUUID().slice(0, 8)}`,
          status: 'active',
          deliveriesCompleted: 0,
          nextDeliveryDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
        }
        set((state) => ({ subscriptions: [newSub, ...state.subscriptions] }))
      },
      toggleStatus: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
          ),
        }))
      },
      cancelSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        }))
      },
    }),
    {
      name: 'jalseva-subscriptions-storage',
    }
  )
)
