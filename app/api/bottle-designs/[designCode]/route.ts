import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBottleDesignByCode } from '@/lib/supabase/bottle-designs-helper'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { designCode: string } }
) {
  try {
    const rawCode = params.designCode
    if (!rawCode) {
      return NextResponse.json({ error: 'Design code is required' }, { status: 400 })
    }

    const designCode = decodeURIComponent(rawCode).trim()
    const supabase = createAdminClient()
    const design = await getBottleDesignByCode(supabase, designCode, true)

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found or no longer active' },
        { status: 404 }
      )
    }

    // Strip internal_notes from public response
    const { internal_notes, ...safeDesign } = design as any

    return NextResponse.json({ design: safeDesign })
  } catch (err: any) {
    console.error('[Public Bottle Design Detail GET Exception]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
