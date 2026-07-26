'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { WaterProduct } from '@/types'

export async function getSupplierIdAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  
  let { data: supplier } = await admin
    .from('suppliers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const phone = user.phone || user.user_metadata?.phone || '9876543211'
  
  if (!supplier && phone) {
    const { data: byPhone } = await admin
      .from('suppliers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
      
    if (byPhone) {
      supplier = byPhone
    }
  }

  if (!supplier) {
    // Attempt to auto-provision auth user to satisfy FK
    const name = user.user_metadata?.name || 'Test Supplier'
    const { error: authErr } = await admin.auth.admin.createUser({
      phone,
      password: 'MockUser123!',
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { role: 'supplier', name, business_name: name, phone }
    })

    if (!authErr || authErr.message.includes('already registered')) {
      const { data: autoCreated } = await admin
        .from('suppliers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()
      if (autoCreated) {
        supplier = autoCreated
      }
    }
  }

  return supplier?.id || user.id
}

export async function fetchProductsAction(supplierId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('water_products')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function addProductAction(payload: any) {
  const admin = createAdminClient()
  const { error } = await admin.from('water_products').insert(payload)
  if (error) throw new Error(error.message)
}

export async function updateProductAction(id: string, payload: any) {
  const admin = createAdminClient()
  const { error } = await admin.from('water_products').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleProductActiveAction(id: string, isActive: boolean) {
  const admin = createAdminClient()
  const { error } = await admin.from('water_products').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProductAction(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('water_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
