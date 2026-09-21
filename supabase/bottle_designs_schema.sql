-- ═══════════════════════════════════════════════════════════════════════════
-- JalSeva — Customized Water Bottle Printing Module
-- Table: bottle_designs & Storage Bucket: bottle-design-images
-- Fully decoupled from tanker booking tables
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create bottle_designs table
CREATE TABLE IF NOT EXISTS bottle_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  occasion_category TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance and filtering
CREATE INDEX IF NOT EXISTS idx_bottle_designs_occasion ON bottle_designs(occasion_category);
CREATE INDEX IF NOT EXISTS idx_bottle_designs_status ON bottle_designs(status);
CREATE INDEX IF NOT EXISTS idx_bottle_designs_created_at ON bottle_designs(created_at DESC);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_bottle_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bottle_designs_updated_at ON bottle_designs;
CREATE TRIGGER trg_bottle_designs_updated_at
BEFORE UPDATE ON bottle_designs
FOR EACH ROW
EXECUTE FUNCTION update_bottle_designs_updated_at();

-- 2. Enable Row Level Security
ALTER TABLE bottle_designs ENABLE ROW LEVEL SECURITY;

-- Customer / Public / Anon policy:
-- Can ONLY SELECT rows where status is 'active'
DROP POLICY IF EXISTS "bottle_designs_public_read" ON bottle_designs;
CREATE POLICY "bottle_designs_public_read" ON bottle_designs
FOR SELECT USING (status = 'active');

-- Super Admin policies:
-- Full SELECT access (including inactive)
DROP POLICY IF EXISTS "bottle_designs_admin_select" ON bottle_designs;
CREATE POLICY "bottle_designs_admin_select" ON bottle_designs
FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  OR auth.role() = 'service_role'
);

-- Super Admin INSERT
DROP POLICY IF EXISTS "bottle_designs_admin_insert" ON bottle_designs;
CREATE POLICY "bottle_designs_admin_insert" ON bottle_designs
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  OR auth.role() = 'service_role'
);

-- Super Admin UPDATE
DROP POLICY IF EXISTS "bottle_designs_admin_update" ON bottle_designs;
CREATE POLICY "bottle_designs_admin_update" ON bottle_designs
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  OR auth.role() = 'service_role'
);

-- Super Admin DELETE
DROP POLICY IF EXISTS "bottle_designs_admin_delete" ON bottle_designs;
CREATE POLICY "bottle_designs_admin_delete" ON bottle_designs
FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  OR auth.role() = 'service_role'
);

-- 3. Storage Bucket: bottle-design-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bottle-design-images', 'bottle-design-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Public read, Admin write
DROP POLICY IF EXISTS "bottle_images_public_read" ON storage.objects;
CREATE POLICY "bottle_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'bottle-design-images');

DROP POLICY IF EXISTS "bottle_images_admin_insert" ON storage.objects;
CREATE POLICY "bottle_images_admin_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bottle-design-images'
  AND (
    auth.role() = 'service_role'
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  )
);

DROP POLICY IF EXISTS "bottle_images_admin_update" ON storage.objects;
CREATE POLICY "bottle_images_admin_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'bottle-design-images'
  AND (
    auth.role() = 'service_role'
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  )
);

DROP POLICY IF EXISTS "bottle_images_admin_delete" ON storage.objects;
CREATE POLICY "bottle_images_admin_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'bottle-design-images'
  AND (
    auth.role() = 'service_role'
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
  )
);
