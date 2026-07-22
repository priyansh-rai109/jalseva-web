-- ═══════════════════════════════════════════════════
-- JalSeva — Supabase Database Schema
-- Run this in Supabase SQL Editor (in order)
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────
-- 1. ZONES
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Jodhpur',
  pincodes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Jodhpur zones
INSERT INTO zones (name, city, pincodes) VALUES
  ('Sardarpura', 'Jodhpur', ARRAY['342001', '342002']),
  ('Ratanada', 'Jodhpur', ARRAY['342001']),
  ('Paota', 'Jodhpur', ARRAY['342010']),
  ('Shastri Nagar', 'Jodhpur', ARRAY['342003']),
  ('City Centre', 'Jodhpur', ARRAY['342001']),
  ('Pal Road', 'Jodhpur', ARRAY['342008']),
  ('Mandore', 'Jodhpur', ARRAY['342304']),
  ('Bhagat Ki Kothi', 'Jodhpur', ARRAY['342001']),
  ('Chopasni Housing Board', 'Jodhpur', ARRAY['342008']),
  ('Residency Road', 'Jodhpur', ARRAY['342001']);

-- ───────────────────────────────────────
-- 2. PROFILES (extends auth.users)
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'supplier', 'customer')) DEFAULT 'customer',
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ───────────────────────────────────────
-- 3. SUPPLIERS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  license_no TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Jodhpur',
  zone_id UUID REFERENCES zones(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  rating NUMERIC(3,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- 4. WATER PRODUCTS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tanker', 'can', 'pouch')),
  capacity_liters NUMERIC,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- 5. CUSTOMERS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  addresses JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- 6. ORDERS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_id UUID NOT NULL REFERENCES water_products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','out_for_delivery','delivered','cancelled')),
  payment_mode TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (payment_mode IN ('cash_on_delivery','online','upi')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
  delivery_address JSONB NOT NULL,
  special_instructions TEXT,
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────
-- 7. ORDER TRACKING
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-insert tracking on order status change
CREATE OR REPLACE FUNCTION track_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO order_tracking (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION track_order_status();

-- ───────────────────────────────────────
-- 8. REVIEWS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Trigger: update supplier rating on new review
CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers
  SET rating = (
    SELECT AVG(rating)::NUMERIC(3,2)
    FROM reviews
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

-- ───────────────────────────────────────
-- 9. NOTIFICATIONS
-- ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('order','system','promo')),
  is_read BOOLEAN DEFAULT FALSE,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, admin reads all
CREATE POLICY "profiles_own_read" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Zones: public read
CREATE POLICY "zones_public_read" ON zones FOR SELECT USING (TRUE);

-- Water products: public read for active products
CREATE POLICY "products_public_read" ON water_products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "products_supplier_manage" ON water_products FOR ALL USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Suppliers: approved suppliers are publicly visible
CREATE POLICY "suppliers_public_read" ON suppliers FOR SELECT USING (status = 'approved');
CREATE POLICY "suppliers_own_manage" ON suppliers FOR ALL USING (user_id = auth.uid());

-- Orders: customer or supplier can see their orders
CREATE POLICY "orders_customer_read" ON orders FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);
CREATE POLICY "orders_supplier_read" ON orders FOR SELECT USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);
CREATE POLICY "orders_customer_insert" ON orders FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);
CREATE POLICY "orders_supplier_update" ON orders FOR UPDATE USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Order tracking: same as orders
CREATE POLICY "tracking_read" ON order_tracking FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders WHERE
      customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
      OR supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  )
);

-- Reviews: public read, customer insert
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_customer_insert" ON reviews FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

-- Customers: own profile only
CREATE POLICY "customers_own" ON customers FOR ALL USING (user_id = auth.uid());

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- ═══════════════════════════════════════
-- REALTIME (enable for live updates)
-- ═══════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE order_tracking;
