import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    const [{ data: order }, { data: tracking }, { data: review }] = await Promise.all([
      adminSupabase
        .from('orders')
        .select(`
          id, total_amount, status, quantity, payment_mode, delivery_address, created_at, special_instructions,
          suppliers(id, business_name, phone, owner_name),
          water_products(name, type, capacity_liters, price)
        `)
        .eq('id', params.id)
        .maybeSingle(),
      adminSupabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', params.id)
        .order('created_at', { ascending: true }),
      adminSupabase
        .from('reviews')
        .select('*')
        .eq('order_id', params.id)
        .maybeSingle(),
    ])

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      order,
      tracking: tracking || [],
      review: review || null,
    })
  } catch (err: any) {
    console.error('[Single Order GET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 })
  }
}
