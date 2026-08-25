import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'

export const dynamic = 'force-dynamic'

// ─── GET: Fetch all drivers for the supplier ────────────────────────────────
export async function GET(_request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({ drivers: [] })
    }

    const { data: drivers, error } = await adminSupabase
      .from('supplier_drivers')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet in Supabase schema cache
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        console.warn('[Supplier Drivers GET] Table supplier_drivers missing:', error.message)
        return NextResponse.json({ drivers: [], tableMissing: true })
      }
      throw error
    }

    return NextResponse.json({ drivers: drivers || [] })
  } catch (err: any) {
    console.error('[Supplier Drivers GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error', drivers: [] }, { status: 500 })
  }
}

// ─── POST: Add a new driver ──────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier account not found' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, vehicle_type, vehicle_number, license_no, status, notes } = body

    if (!name || !phone || !vehicle_number) {
      return NextResponse.json({ error: 'Name, phone and vehicle number are required' }, { status: 400 })
    }

    const payload = {
      supplier_id: supplier.id,
      name: name.trim(),
      phone: phone.trim(),
      vehicle_type: vehicle_type?.trim() || 'Tanker',
      vehicle_number: vehicle_number.trim().toUpperCase(),
      license_no: license_no?.trim() || null,
      status: status || 'active',
      notes: notes?.trim() || null,
    }

    const { data: driver, error } = await adminSupabase
      .from('supplier_drivers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        return NextResponse.json({
          error: 'The supplier_drivers table is not set up in Supabase database yet. Please run the SQL migration script from supabase/drivers_schema.sql in Supabase SQL editor.'
        }, { status: 500 })
      }
      throw error
    }

    return NextResponse.json({ success: true, driver })
  } catch (err: any) {
    console.error('[Supplier Drivers POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}

// ─── PATCH: Update driver profile or status ─────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier account not found' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, phone, vehicle_type, vehicle_number, license_no, status, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updatePayload.name = name.trim()
    if (phone !== undefined) updatePayload.phone = phone.trim()
    if (vehicle_type !== undefined) updatePayload.vehicle_type = vehicle_type.trim()
    if (vehicle_number !== undefined) updatePayload.vehicle_number = vehicle_number.trim().toUpperCase()
    if (license_no !== undefined) updatePayload.license_no = license_no.trim() || null
    if (status !== undefined) updatePayload.status = status
    if (notes !== undefined) updatePayload.notes = notes.trim() || null

    const { data: driver, error } = await adminSupabase
      .from('supplier_drivers')
      .update(updatePayload)
      .eq('id', id)
      .eq('supplier_id', supplier.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, driver })
  } catch (err: any) {
    console.error('[Supplier Drivers PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}

// ─── DELETE: Delete a driver profile ─────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const supplier = await getSupplierForUser(user)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier account not found' }, { status: 403 })
    }

    const { error } = await adminSupabase
      .from('supplier_drivers')
      .delete()
      .eq('id', id)
      .eq('supplier_id', supplier.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Supplier Drivers DELETE Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
