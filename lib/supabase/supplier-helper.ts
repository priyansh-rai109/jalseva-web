import { createAdminClient } from './admin'

export async function getSupplierForUser(user: { id: string; phone?: string | null; user_metadata?: any }) {
  if (!user || !user.id) return null

  const adminSupabase = createAdminClient()
  const phoneToUse = user.phone || user.user_metadata?.phone

  // 1. Match by user_id
  let { data: supplier } = await adminSupabase
    .from('suppliers')
    .select('*, zones(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (supplier) return supplier

  // 2. Match by supplier id directly
  ;({ data: supplier } = await adminSupabase
    .from('suppliers')
    .select('*, zones(name)')
    .eq('id', user.id)
    .maybeSingle())

  if (supplier) return supplier

  // 3. Fallback: Match by phone number
  if (phoneToUse) {
    const digits = phoneToUse.replace(/\D/g, '').slice(-10)
    if (digits) {
      ;({ data: supplier } = await adminSupabase
        .from('suppliers')
        .select('*, zones(name)')
        .ilike('phone', `%${digits}%`)
        .maybeSingle())

      if (supplier) return supplier
    }
  }

  return null
}
