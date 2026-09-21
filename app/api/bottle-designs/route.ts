import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Customer-safe columns ONLY — NEVER include internal_notes!
const SAFE_COLUMNS = 'id, design_code, title, occasion_category, description, tags, images, status, created_at, updated_at'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const supabase = createAdminClient()

    let query = supabase
      .from('bottle_designs')
      .select(SAFE_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category && category.toLowerCase() !== 'all') {
      query = query.eq('occasion_category', category)
    }

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,design_code.ilike.%${search.trim()}%`)
    }

    const { data: designs, error } = await query

    if (error) {
      console.error('[Public Bottle Designs GET Error]', error)
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ designs: [] })
      }
      return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 })
    }

    return NextResponse.json({ designs: designs || [] })
  } catch (err: any) {
    console.error('[Public Bottle Designs GET Exception]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
