import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  listBottleDesigns,
  createBottleDesign,
  updateBottleDesign,
  deleteBottleDesign,
} from '@/lib/supabase/bottle-designs-helper'

export const dynamic = 'force-dynamic'

/**
 * Helper to ensure the requesting user is a Super Admin
 */
async function verifySuperAdmin(): Promise<boolean> {
  try {
    const serverSupabase = await createClient()
    const {
      data: { user },
    } = await serverSupabase.auth.getUser()

    if (!user) return false

    // 1. Direct metadata / known admin email check
    if (user.user_metadata?.role === 'super_admin' || user.email === 'raipriyansh45@gmail.com') {
      return true
    }

    // 2. Query profiles with service role client to bypass RLS
    const adminSupabase = createAdminClient()
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    return profile?.role === 'super_admin'
  } catch (err) {
    console.warn('[Admin Bottle Designs verifySuperAdmin Warning]', err)
    return false
  }
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

    const adminClient = createAdminClient()
    const { designs } = await listBottleDesigns(adminClient, {
      category,
      status,
      search,
      activeOnly: false,
    })

    return NextResponse.json({ designs })
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

    const adminClient = createAdminClient()

    const { design } = await createBottleDesign(adminClient, {
      design_code: design_code.trim().toUpperCase(),
      title: title.trim(),
      occasion_category: occasion_category.trim(),
      description: description?.trim() || null,
      tags: formattedTags,
      images,
      status: status === 'inactive' ? 'inactive' : 'active',
      internal_notes: internal_notes?.trim() || null,
    })

    return NextResponse.json({ success: true, design })
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

    const updates: Record<string, any> = {}

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

    const adminClient = createAdminClient()
    const { design } = await updateBottleDesign(adminClient, id, updates)

    return NextResponse.json({ success: true, design })
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

    const adminClient = createAdminClient()
    const { success } = await deleteBottleDesign(adminClient, id)

    return NextResponse.json({ success, message: 'Bottle design deleted successfully' })
  } catch (err: any) {
    console.error('[Admin Bottle Designs DELETE Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
