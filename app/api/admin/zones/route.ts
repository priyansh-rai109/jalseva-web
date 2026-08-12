import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET: List all zones
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: zones, error } = await supabase
      .from('zones')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[Admin Zones GET Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ zones: zones || [] })
  } catch (err: any) {
    console.error('[Admin Zones GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Add a new zone
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, city = 'Jodhpur', pincodes = [], is_active = true } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Zone name is required' }, { status: 400 })
    }

    // Ensure pincodes is an array of clean strings
    const formattedPincodes = Array.isArray(pincodes)
      ? pincodes.map((p: any) => String(p).trim()).filter(Boolean)
      : typeof pincodes === 'string'
      ? pincodes.split(',').map((p: string) => p.trim()).filter(Boolean)
      : []

    const supabase = createAdminClient()
    const { data: newZone, error } = await supabase
      .from('zones')
      .insert({
        name: name.trim(),
        city: (city || 'Jodhpur').trim(),
        pincodes: formattedPincodes,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Zones POST Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, zone: newZone })
  } catch (err: any) {
    console.error('[Admin Zones POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH: Update zone (toggle is_active or edit details)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, city, pincodes, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name.trim()
    if (city !== undefined) updates.city = city.trim()
    if (is_active !== undefined) updates.is_active = is_active
    if (pincodes !== undefined) {
      updates.pincodes = Array.isArray(pincodes)
        ? pincodes.map((p: any) => String(p).trim()).filter(Boolean)
        : typeof pincodes === 'string'
        ? pincodes.split(',').map((p: string) => p.trim()).filter(Boolean)
        : []
    }

    const supabase = createAdminClient()
    const { data: updatedZone, error } = await supabase
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Zones PATCH Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, zone: updatedZone })
  } catch (err: any) {
    console.error('[Admin Zones PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Delete a zone
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Clear zone_id from suppliers using this zone first so foreign keys don't break
    await supabase.from('suppliers').update({ zone_id: null }).eq('zone_id', id)

    const { error } = await supabase.from('zones').delete().eq('id', id)

    if (error) {
      console.error('[Admin Zones DELETE Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Zone deleted successfully' })
  } catch (err: any) {
    console.error('[Admin Zones DELETE Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
