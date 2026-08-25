import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupplierForUser } from '@/lib/supabase/supplier-helper'

export const dynamic = 'force-dynamic'

// ─── Fallback Storage Helpers ───────────────────────────────────────────────
async function getFallbackDrivers(adminSupabase: any, supplierId: string) {
  const { data: supplier } = await adminSupabase
    .from('suppliers')
    .select('id, description')
    .eq('id', supplierId)
    .maybeSingle()

  let drivers: any[] = []
  const rawDesc = supplier?.description || ''
  if (rawDesc.includes('__DRIVERS_DATA__')) {
    try {
      const parts = rawDesc.split('__DRIVERS_DATA__')
      drivers = JSON.parse(parts[1])
    } catch (e) {
      console.warn('[Fallback Drivers Parse Error]', e)
    }
  }
  return { drivers, currentDescription: rawDesc }
}

async function saveFallbackDrivers(adminSupabase: any, supplierId: string, drivers: any[], currentDescription: string) {
  const cleanDesc = currentDescription.split('__DRIVERS_DATA__')[0] || ''
  const newDesc = `${cleanDesc}__DRIVERS_DATA__${JSON.stringify(drivers)}`
  await adminSupabase
    .from('suppliers')
    .update({ description: newDesc })
    .eq('id', supplierId)
}

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

    // 1. Try querying supplier_drivers table
    const { data: drivers, error } = await adminSupabase
      .from('supplier_drivers')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        // Table missing fallback: read from suppliers.description JSON
        const { drivers: fallbackList } = await getFallbackDrivers(adminSupabase, supplier.id)
        return NextResponse.json({ drivers: fallbackList })
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

    // 1. Try table insert
    const { data: driver, error } = await adminSupabase
      .from('supplier_drivers')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        // Fallback store when table is not created in Supabase yet
        const { drivers: existingList, currentDescription } = await getFallbackDrivers(adminSupabase, supplier.id)
        const fallbackDriver = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...payload,
        }
        const updatedList = [fallbackDriver, ...existingList]
        await saveFallbackDrivers(adminSupabase, supplier.id, updatedList, currentDescription)
        return NextResponse.json({ success: true, driver: fallbackDriver })
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

    // 1. Try table update
    const { data: driver, error } = await adminSupabase
      .from('supplier_drivers')
      .update(updatePayload)
      .eq('id', id)
      .eq('supplier_id', supplier.id)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        // Fallback update
        const { drivers: existingList, currentDescription } = await getFallbackDrivers(adminSupabase, supplier.id)
        let updatedDriver: any = null
        const updatedList = existingList.map(d => {
          if (d.id === id) {
            updatedDriver = { ...d, ...updatePayload }
            return updatedDriver
          }
          return d
        })
        await saveFallbackDrivers(adminSupabase, supplier.id, updatedList, currentDescription)
        return NextResponse.json({ success: true, driver: updatedDriver })
      }
      throw error
    }

    if (!driver) {
      // Check fallback if not in table
      const { drivers: existingList, currentDescription } = await getFallbackDrivers(adminSupabase, supplier.id)
      let updatedDriver: any = null
      const updatedList = existingList.map(d => {
        if (d.id === id) {
          updatedDriver = { ...d, ...updatePayload }
          return updatedDriver
        }
        return d
      })
      await saveFallbackDrivers(adminSupabase, supplier.id, updatedList, currentDescription)
      return NextResponse.json({ success: true, driver: updatedDriver })
    }

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

    // 1. Try table delete
    const { error } = await adminSupabase
      .from('supplier_drivers')
      .delete()
      .eq('id', id)
      .eq('supplier_id', supplier.id)

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('supplier_drivers')) {
        // Fallback delete
        const { drivers: existingList, currentDescription } = await getFallbackDrivers(adminSupabase, supplier.id)
        const updatedList = existingList.filter(d => d.id !== id)
        await saveFallbackDrivers(adminSupabase, supplier.id, updatedList, currentDescription)
        return NextResponse.json({ success: true })
      }
      throw error
    }

    // Also remove from fallback list if it exists there
    const { drivers: existingList, currentDescription } = await getFallbackDrivers(adminSupabase, supplier.id)
    if (existingList.some(d => d.id === id)) {
      const updatedList = existingList.filter(d => d.id !== id)
      await saveFallbackDrivers(adminSupabase, supplier.id, updatedList, currentDescription)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Supplier Drivers DELETE Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
