import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()
    const phone = user.phone || user.user_metadata?.phone || '9876543211'
    
    // Resolve supplier
    let { data: supplier } = await adminSupabase.from('suppliers').select('id').eq('user_id', user.id).maybeSingle()
    if (!supplier && phone) {
      const { data: byPhone } = await adminSupabase.from('suppliers').select('id').eq('phone', phone).maybeSingle()
      supplier = byPhone
    }

    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

    const { data: products } = await adminSupabase
      .from('water_products')
      .select('*')
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ products: products || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()
    const phone = user.phone || user.user_metadata?.phone || '9876543211'
    
    let { data: supplier } = await adminSupabase.from('suppliers').select('id').eq('user_id', user.id).maybeSingle()
    if (!supplier && phone) {
      const { data: byPhone } = await adminSupabase.from('suppliers').select('id').eq('phone', phone).maybeSingle()
      supplier = byPhone
    }
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

    const payload = await request.json()
    payload.supplier_id = supplier.id

    const { data: product, error } = await adminSupabase.from('water_products').insert(payload).select().single()
    if (error) throw error

    return NextResponse.json({ product })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
