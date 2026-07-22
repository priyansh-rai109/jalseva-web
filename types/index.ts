// ═══════════════════════════════════════
// JalSeva — TypeScript Types & Interfaces
// ═══════════════════════════════════════

export type UserRole = 'super_admin' | 'supplier' | 'customer'

export type SupplierStatus = 'pending' | 'approved' | 'suspended' | 'rejected'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type ProductType = 'tanker' | 'can' | 'pouch'

export type PaymentMode = 'cash_on_delivery' | 'online' | 'upi'

// ───────────────────────────────────────
// User / Profile
// ───────────────────────────────────────
export interface Profile {
  id: string
  role: UserRole
  name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ───────────────────────────────────────
// Supplier
// ───────────────────────────────────────
export interface Supplier {
  id: string
  user_id: string
  business_name: string
  owner_name: string
  license_no: string | null
  phone: string
  email: string | null
  address: string
  city: string
  zone_id: string | null
  status: SupplierStatus
  rating: number
  total_orders: number
  description: string | null
  logo_url: string | null
  banner_url: string | null
  created_at: string
  updated_at: string
  // joined
  zone?: Zone
  products?: WaterProduct[]
}

// ───────────────────────────────────────
// Water Product
// ───────────────────────────────────────
export interface WaterProduct {
  id: string
  supplier_id: string
  name: string
  type: ProductType
  capacity_liters: number | null
  price: number
  unit: string
  stock: number
  image_url: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  supplier?: Supplier
}

// ───────────────────────────────────────
// Customer
// ───────────────────────────────────────
export interface Customer {
  id: string
  user_id: string
  name: string
  phone: string
  email: string | null
  addresses: Address[]
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  label: string // Home, Office, etc.
  line1: string
  line2?: string
  pincode: string
  city: string
  is_default: boolean
}

// ───────────────────────────────────────
// Order
// ───────────────────────────────────────
export interface Order {
  id: string
  customer_id: string
  supplier_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  status: OrderStatus
  payment_mode: PaymentMode
  payment_status: 'pending' | 'paid'
  delivery_address: Address
  special_instructions: string | null
  scheduled_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  // joined
  customer?: Customer
  supplier?: Supplier
  product?: WaterProduct
  tracking?: OrderTracking[]
  review?: Review
}

// ───────────────────────────────────────
// Order Tracking
// ───────────────────────────────────────
export interface OrderTracking {
  id: string
  order_id: string
  status: OrderStatus
  note: string | null
  created_at: string
}

// ───────────────────────────────────────
// Review
// ───────────────────────────────────────
export interface Review {
  id: string
  order_id: string
  customer_id: string
  supplier_id: string
  rating: number
  comment: string | null
  created_at: string
  // joined
  customer?: Customer
}

// ───────────────────────────────────────
// Zone
// ───────────────────────────────────────
export interface Zone {
  id: string
  name: string
  city: string
  pincodes: string[]
  is_active: boolean
  created_at: string
}

// ───────────────────────────────────────
// Notification
// ───────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'order' | 'system' | 'promo'
  is_read: boolean
  reference_id: string | null
  created_at: string
}

// ───────────────────────────────────────
// Cart (client-side only)
// ───────────────────────────────────────
export interface CartItem {
  product: WaterProduct
  quantity: number
}

export interface Cart {
  supplier_id: string | null
  items: CartItem[]
}

// ───────────────────────────────────────
// Dashboard Stats
// ───────────────────────────────────────
export interface AdminStats {
  total_suppliers: number
  pending_suppliers: number
  total_customers: number
  total_orders: number
  total_revenue: number
  orders_today: number
  revenue_today: number
}

export interface SupplierStats {
  total_orders: number
  pending_orders: number
  delivered_today: number
  revenue_today: number
  revenue_month: number
  average_rating: number
}
