-- ═══════════════════════════════════════════════════
-- JalSeva — Complaints & Zapier Outbox Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_investigation', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for customer and order complaint lookups
CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);

-- 2. Transactional Outbox for Webhook Dispatch
CREATE TABLE IF NOT EXISTS complaint_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE,
  event_type TEXT NOT NULL DEFAULT 'complaint.created',
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  response_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding pending/retryable outbox events
CREATE INDEX IF NOT EXISTS idx_complaint_outbox_queue ON complaint_outbox(status, next_retry_at)
  WHERE status IN ('pending', 'failed');

-- 3. Row Level Security Policies
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_outbox ENABLE ROW LEVEL SECURITY;

-- Customers can view their own complaints
DROP POLICY IF EXISTS "complaints_customer_read" ON complaints;
CREATE POLICY "complaints_customer_read" ON complaints FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

-- Customers can insert complaints for their own profile
DROP POLICY IF EXISTS "complaints_customer_insert" ON complaints;
CREATE POLICY "complaints_customer_insert" ON complaints FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
);

-- Super Admins can view and manage all complaints
DROP POLICY IF EXISTS "complaints_admin_all" ON complaints;
CREATE POLICY "complaints_admin_all" ON complaints FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Outbox table: Service role has full access; users cannot read outbox directly
DROP POLICY IF EXISTS "complaint_outbox_service_role" ON complaint_outbox;
CREATE POLICY "complaint_outbox_service_role" ON complaint_outbox FOR ALL USING (
  auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
