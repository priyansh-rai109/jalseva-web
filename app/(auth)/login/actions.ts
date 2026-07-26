'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function checkExistingUserByPhone(phone: string) {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('phone', phone)
    .maybeSingle()

  if (profile) {
    return profile
  }

  // Also check if they were auto-provisioned with the dummy email pattern
  const dummyEmail = `test_${phone.replace('+', '')}@jalseva.demo`
  const { data: profileByEmail } = await admin
    .from('profiles')
    .select('id, role')
    .eq('email', dummyEmail)
    .maybeSingle()

  return profileByEmail || null
}
