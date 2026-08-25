-- ═══════════════════════════════════════════════════
-- JalSeva — Supplier Drivers Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'Tanker',
  vehicle_number TEXT NOT NULL,
  license_no TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_duty')),
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of supplier's drivers
CREATE INDEX IF NOT EXISTS idx_supplier_drivers_supplier_id ON supplier_drivers(supplier_id);

-- Alter orders table to include driver assignment fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES supplier_drivers(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

-- Row Level Security for supplier_drivers
ALTER TABLE supplier_drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_drivers_read" ON supplier_drivers;
CREATE POLICY "supplier_drivers_read" ON supplier_drivers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "supplier_drivers_supplier_manage" ON supplier_drivers;
CREATE POLICY "supplier_drivers_supplier_manage" ON supplier_drivers FOR ALL USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'supplier_drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE supplier_drivers;
  END IF;
END $$;
