// ─── JalSeva Mock Supabase Layer ───────────────────────────────────────────
// This file intercepts Supabase client/server calls when placeholder credentials
// are used. It enables a fully functional local-first interactive demo of JalSeva.

export interface MockUser {
  id: string
  email: string
  user_metadata: {
    role: string
    name: string
    phone?: string
  }
}

// Default mock profiles and data
export const mockProfiles: Record<string, any> = {
  'admin-id': { id: 'admin-id', role: 'super_admin', name: 'Super Admin', email: 'admin@jalseva.in' },
  'supplier-id': { id: 'supplier-id', role: 'supplier', name: 'Ramesh Kumar', phone: '9829012345', email: 'supplier@jalseva.in' },
  'customer-id': { id: 'customer-id', role: 'customer', name: 'Vijay Jodhpur', phone: '9876543210', email: 'customer@jalseva.in' },
}

export const mockSuppliers = [
  {
    id: 'supplier-1',
    user_id: 'supplier-id',
    business_name: 'Marwar Pure Water',
    owner_name: 'Ramesh Kumar',
    license_no: 'LIC-342001-A',
    phone: '9829012345',
    email: 'supplier@jalseva.in',
    address: '12, Sardarpura B Road, Jodhpur',
    city: 'Jodhpur',
    zone_id: 'zone-1',
    status: 'approved',
    rating: 4.8,
    total_orders: 142,
    description: 'Providing premium quality RO purified mineral water across Sardarpura and nearby locations since 2018.',
  },
  {
    id: 'supplier-2',
    user_id: 'supplier-2-id',
    business_name: 'Jodhpur Water Services',
    owner_name: 'Suresh Bhati',
    license_no: 'LIC-342003-B',
    phone: '9414198765',
    email: 'suresh@jalseva.in',
    address: '45, Shastri Nagar, Jodhpur',
    city: 'Jodhpur',
    zone_id: 'zone-2',
    status: 'approved',
    rating: 4.5,
    total_orders: 98,
    description: 'Quick tanker deliveries and chilled water cans for events and residential use.',
  }
]

export const mockZones = [
  { id: 'zone-1', name: 'Sardarpura', city: 'Jodhpur', pincodes: ['342001', '342003'], is_active: true },
  { id: 'zone-2', name: 'Shastri Nagar', city: 'Jodhpur', pincodes: ['342003', '342005'], is_active: true },
  { id: 'zone-3', name: 'Ratanada', city: 'Jodhpur', pincodes: ['342011'], is_active: true },
]

export const mockProducts = [
  { id: 'prod-1', supplier_id: 'supplier-1', name: '20L Premium RO Water Can', type: 'can', capacity_liters: 20, price: 40, unit: 'can', stock: 150, is_active: true },
  { id: 'prod-2', supplier_id: 'supplier-1', name: '1000L Domestic Water Tanker', type: 'tanker', capacity_liters: 1000, price: 700, unit: 'tanker', stock: 10, is_active: true },
  { id: 'prod-3', supplier_id: 'supplier-2', name: '20L Chilled Bubble Can', type: 'can', capacity_liters: 20, price: 50, unit: 'can', stock: 80, is_active: true },
]

export const mockOrders = [
  {
    id: 'order-1',
    customer_id: 'customer-1',
    supplier_id: 'supplier-1',
    product_id: 'prod-1',
    quantity: 3,
    unit_price: 40,
    total_amount: 120,
    status: 'delivered',
    payment_mode: 'cash_on_delivery',
    payment_status: 'paid',
    delivery_address: { line1: 'Sector 3, Shastri Nagar', city: 'Jodhpur', pincode: '342003' },
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'order-2',
    customer_id: 'customer-1',
    supplier_id: 'supplier-1',
    product_id: 'prod-1',
    quantity: 2,
    unit_price: 40,
    total_amount: 80,
    status: 'pending',
    payment_mode: 'upi',
    payment_status: 'pending',
    delivery_address: { line1: 'Sardarpura C Road', city: 'Jodhpur', pincode: '342001' },
    created_at: new Date().toISOString(),
  }
]

export const mockNotifications = [
  { id: 'notif-1', user_id: 'customer-id', title: 'Order Confirmed', body: 'Your order for 20L RO Can has been confirmed.', type: 'order', is_read: false, created_at: new Date().toISOString() },
  { id: 'notif-2', user_id: 'supplier-id', title: 'New Order Received', body: 'Vijay Jodhpur has ordered 2 cans.', type: 'order', is_read: false, created_at: new Date().toISOString() },
]

// Mock Auth logic
export function mockSignIn(email: string, roleFromQuery?: string) {
  let role = 'customer'
  let id = 'customer-id'
  let name = 'Vijay Jodhpur'

  if (email.includes('admin')) {
    role = 'super_admin'
    id = 'admin-id'
    name = 'Super Admin'
  } else if (email.includes('supplier')) {
    role = 'supplier'
    id = 'supplier-id'
    name = 'Ramesh Kumar'
  }

  // Allow custom override
  if (roleFromQuery) {
    role = roleFromQuery
    id = `${role}-id`
    name = `${role.charAt(0).toUpperCase() + role.slice(1)} User`
  }

  return {
    user: {
      id,
      email,
      user_metadata: { role, name },
    }
  }
}
