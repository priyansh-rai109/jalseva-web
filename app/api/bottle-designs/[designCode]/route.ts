import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SAFE_COLUMNS = 'id, design_code, title, occasion_category, description, tags, images, status, created_at, updated_at'

export async function GET(
  request: Request,
  { params }: { params: { designCode: string } }
) {
  try {
    const rawCode = params.designCode
    if (!rawCode) {
      return NextResponse.json({ error: 'Design code is required' }, { status: 400 })
    }

    const designCode = decodeURIComponent(rawCode).trim().toUpperCase()

    const supabase = createAdminClient()
    const { data: design, error } = await supabase
      .from('bottle_designs')
      .select(SAFE_COLUMNS)
      .eq('design_code', designCode)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('[Public Bottle Design Detail GET Error]', error)
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({ error: 'Design not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch design' }, { status: 500 })
    }

    if (!design) {
      return NextResponse.json({ error: 'Design not found or no longer active' }, { status: 404 })
    }

    return NextResponse.json({ design })
  } catch (err: any) {
    console.error('[Public Bottle Design Detail GET Exception]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
