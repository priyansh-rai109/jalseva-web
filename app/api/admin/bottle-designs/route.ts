import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Helper to ensure the requesting user is a Super Admin
 */
async function verifySuperAdmin() {
  const serverSupabase = await createClient()
  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role === 'super_admin'
}

// ─── GET: List all bottle designs for Admin ──────────────────────────────
export async function GET(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const supabase = createAdminClient()
    let query = supabase
      .from('bottle_designs')
      .select('*')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('occasion_category', category)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,design_code.ilike.%${search.trim()}%`)
    }

    const { data: designs, error } = await query

    if (error) {
      console.error('[Admin Bottle Designs GET Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ designs: designs || [] })
  } catch (err: any) {
    console.error('[Admin Bottle Designs GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// ─── POST: Add a new bottle design ──────────────────────────────────────
export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const {
      design_code,
      title,
      occasion_category,
      description = '',
      tags = [],
      images = [],
      status = 'active',
      internal_notes = '',
    } = body

    if (!design_code || !design_code.trim()) {
      return NextResponse.json({ error: 'Design Code is required (e.g. WD-101)' }, { status: 400 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Design Title is required' }, { status: 400 })
    }

    if (!occasion_category || !occasion_category.trim()) {
      return NextResponse.json({ error: 'Occasion Category is required' }, { status: 400 })
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one design image is required' }, { status: 400 })
    }

    // Clean tags
    const formattedTags = Array.isArray(tags)
      ? tags.map((t: any) => String(t).trim()).filter(Boolean)
      : typeof tags === 'string'
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : []

    const supabase = createAdminClient()

    // Check for duplicate design_code
    const { data: existing } = await supabase
      .from('bottle_designs')
      .select('id')
      .eq('design_code', design_code.trim().toUpperCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `Design code "${design_code.trim().toUpperCase()}" already exists. Please use a unique code.` }, { status: 400 })
    }

    const { data: newDesign, error } = await supabase
      .from('bottle_designs')
      .insert({
        design_code: design_code.trim().toUpperCase(),
        title: title.trim(),
        occasion_category: occasion_category.trim(),
        description: description?.trim() || null,
        tags: formattedTags,
        images,
        status: status === 'inactive' ? 'inactive' : 'active',
        internal_notes: internal_notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Bottle Designs POST Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, design: newDesign })
  } catch (err: any) {
    console.error('[Admin Bottle Designs POST Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// ─── PATCH: Update an existing bottle design ────────────────────────────
export async function PATCH(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, design_code, title, occasion_category, description, tags, images, status, internal_notes } = body

    if (!id) {
      return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (design_code !== undefined) updates.design_code = design_code.trim().toUpperCase()
    if (title !== undefined) updates.title = title.trim()
    if (occasion_category !== undefined) updates.occasion_category = occasion_category.trim()
    if (description !== undefined) updates.description = description ? description.trim() : null
    if (internal_notes !== undefined) updates.internal_notes = internal_notes ? internal_notes.trim() : null
    if (status !== undefined) updates.status = status === 'inactive' ? 'inactive' : 'active'
    if (images !== undefined) {
      if (!Array.isArray(images) || images.length === 0) {
        return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
      }
      updates.images = images
    }
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof tags === 'string'
        ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []
    }

    const supabase = createAdminClient()

    // If design_code is being changed, ensure uniqueness
    if (updates.design_code) {
      const { data: duplicate } = await supabase
        .from('bottle_designs')
        .select('id')
        .eq('design_code', updates.design_code)
        .neq('id', id)
        .maybeSingle()

      if (duplicate) {
        return NextResponse.json({ error: `Design code "${updates.design_code}" is already in use by another design.` }, { status: 400 })
      }
    }

    const { data: updatedDesign, error } = await supabase
      .from('bottle_designs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Bottle Designs PATCH Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, design: updatedDesign })
  } catch (err: any) {
    console.error('[Admin Bottle Designs PATCH Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// ─── DELETE: Delete a bottle design ────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin()
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Design ID is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('bottle_designs').delete().eq('id', id)

    if (error) {
      console.error('[Admin Bottle Designs DELETE Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Bottle design deleted successfully' })
  } catch (err: any) {
    console.error('[Admin Bottle Designs DELETE Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
