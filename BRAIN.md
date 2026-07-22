# BRAIN.md — JalSeva Water Delivery Platform

> Last Updated: July 2026  
> Project Type: Multi-role Water Delivery Marketplace  
> Location: Jodhpur, Rajasthan, India

---

## 🧠 Project Overview

**JalSeva** is a professional water delivery marketplace that connects water suppliers (businesses) with customers in Jodhpur, Rajasthan. The platform is managed by a Super Admin who oversees all operations.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Phone OTP + Email/Password) |
| Realtime | Supabase Realtime |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |

---

## 👥 User Roles

### 1. SUPER ADMIN (Platform Owner)
- Full platform control
- Approves/suspends suppliers
- Views all orders, customers, revenue
- Manages delivery zones for Jodhpur
- Platform configuration & commission rates
- Login: `/admin-login` (separate, secure)

### 2. SUPPLIER (Water Business Owner)
- Registers on platform (requires admin approval)
- Manages water products (tankers, cans, pouches)
- Accepts/rejects/fulfills customer orders
- Sets delivery zones
- Views revenue analytics
- Dashboard: `/supplier/dashboard`

### 3. CUSTOMER (Person Ordering Water)
- Browses suppliers by zone/pincode
- Orders water products
- Tracks orders in real-time
- Manages delivery addresses
- Dashboard: `/customer/dashboard`

---

## 💧 Water Product Types

1. **Tanker** — Bulk water delivery (thousands of liters)
2. **Can** — 20-liter water cans
3. **Pouch** — RO/purified water pouches

---

## 📦 Business Workflow

```
Customer browses suppliers by zone
    ↓
Selects product & places order
    ↓
Supplier receives notification (realtime)
    ↓
Supplier confirms order
    ↓
Water delivered → Supplier marks "Delivered"
    ↓
Customer confirms receipt & reviews
    ↓
Admin monitors all transactions
```

---

## 🗄️ Database Schema

### Tables
- `profiles` — user_id, role (super_admin|supplier|customer), name, phone, email
- `suppliers` — business_name, license_no, address, zone, status (pending|approved|suspended), rating
- `water_products` — supplier_id, name, type (tanker|can|pouch), capacity_liters, price, unit, stock, image_url, is_active
- `customers` — user_id, name, phone, addresses[]
- `orders` — customer_id, supplier_id, product_id, quantity, total_amount, status (pending|confirmed|out_for_delivery|delivered|cancelled), payment_mode, delivery_address
- `order_tracking` — order_id, status, note, timestamp
- `reviews` — order_id, customer_id, supplier_id, rating, comment
- `zones` — name, city, pincodes[]
- `notifications` — user_id, title, body, is_read

---

## 🗂️ Folder Structure

```
app/
├── (public)/               # Landing page, about, etc.
│   ├── page.tsx            # Main landing page
│   └── layout.tsx
├── (auth)/                 # Auth pages
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── admin-login/page.tsx
├── (admin)/admin/          # Super Admin dashboard
│   ├── layout.tsx
│   ├── page.tsx            # dashboard
│   ├── suppliers/
│   ├── customers/
│   ├── orders/
│   ├── zones/
│   ├── analytics/
│   └── settings/
├── (supplier)/supplier/    # Supplier dashboard
│   ├── layout.tsx
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── zone/
│   ├── reviews/
│   ├── profile/
│   └── analytics/
└── (customer)/customer/    # Customer dashboard
    ├── layout.tsx
    ├── dashboard/
    ├── browse/
    ├── supplier/[id]/
    ├── cart/
    ├── orders/
    ├── profile/
    └── notifications/

components/
├── ui/                     # shadcn components
├── shared/                 # Navbar, Sidebar, NotificationBell
├── admin/                  # Admin-specific components
├── supplier/               # Supplier-specific components
└── customer/               # Customer-specific components

lib/
├── supabase/               # browser.ts, server.ts, middleware.ts
├── hooks/                  # useAuth, useOrders, useNotifications
├── stores/                 # Zustand stores (auth, cart, orders)
└── utils/                  # helpers, formatters

types/
└── index.ts                # All TypeScript types/interfaces
```

---

## 🎨 Design System

- **Primary Blue**: #0EA5E9 (sky-500) — Water/trust
- **Deep Navy**: #0F172A (slate-900) — Premium dark
- **Accent Amber**: #F59E0B — Rajasthan warmth
- **Success Green**: #10B981
- **Font**: Inter (body) + Rajdhani (headings, Rajasthani feel)
- **Theme**: Dark mode primary with glassmorphism cards

---

## 🔐 Auth Flow

1. `/login` — Customer/Supplier login (email+password or phone OTP)
2. `/register` — Public registration (select role: customer or supplier)
3. `/admin-login` — Admin-only entry (email+password, separate page)
4. After login → middleware reads role from `profiles` table → redirects to correct dashboard
5. `middleware.ts` protects all `/admin/*`, `/supplier/*`, `/customer/*` routes

---

## 🌐 Environment Variables

See `.env.local.example` for required variables.
Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📍 Jodhpur Delivery Zones

Pre-configured zones for Jodhpur:
- Sardarpura, Ratanada, Paota, Shastri Nagar
- Jodhpur City Centre, Pal Road, Mandore
- Bhagat Ki Kothi, Chopasni Housing Board, Residency Road

---

## 🚀 Development Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
```
