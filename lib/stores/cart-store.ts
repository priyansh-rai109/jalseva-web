import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, WaterProduct } from '@/types'

interface CartState {
  supplier_id: string | null
  items: CartItem[]
  addItem: (product: WaterProduct, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotalAmount: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      supplier_id: null,
      items: [],

      addItem: (product, quantity) => {
        const { items, supplier_id } = get()

        // If adding from a different supplier, clear cart
        if (supplier_id && supplier_id !== product.supplier_id) {
          set({
            supplier_id: product.supplier_id,
            items: [{ product, quantity }],
          })
          return
        }

        const existing = items.find((i) => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({
            supplier_id: product.supplier_id,
            items: [...items, { product, quantity }],
          })
        }
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.product.id !== productId)
        set({ items, supplier_id: items.length ? get().supplier_id : null })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [], supplier_id: null }),

      getTotalAmount: () =>
        get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        ),

      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: 'jalseva-cart',
    }
  )
)
