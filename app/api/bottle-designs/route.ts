import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listBottleDesigns } from '@/lib/supabase/bottle-designs-helper'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const supabase = createAdminClient()
    const { designs } = await listBottleDesigns(supabase, {
      category,
      search,
      activeOnly: true,
    })

    // Mask internal_notes from public response
    const safeDesigns = designs.map((d) => {
      const { internal_notes, ...rest } = d as any
      return rest
    })

    return NextResponse.json({ designs: safeDesigns })
  } catch (err: any) {
    console.error('[Public Bottle Designs GET Exception]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
