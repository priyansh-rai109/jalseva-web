import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE variables in .env.local")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdmin() {
  const email = 'raipriyansh45@gmail.com'
  const password = 'Maa@2509'

  console.log(`Setting up Admin user for ${email}...`)

  let userId;
  
  // Try to find the user first
  console.log('Fetching user list...')
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
  const existing = usersData.users.find(u => u.email === email)
  
  if (existing) {
    userId = existing.id
    console.log('Found existing user id:', userId)
    
    // Update their password just to be sure it matches "Maa@2509"
    console.log('Updating password to ensure it matches...')
    await supabaseAdmin.auth.admin.updateUserById(userId, { password })
  } else {
    // 1. Try to create the user in Auth
    let { data: userAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'super_admin', name: 'Admin Priyansh' }
    })
    
    if (authError) {
      console.error('Error creating user:', authError)
      return
    }
    userId = userAuth.user.id
    console.log('Created new user in auth:', userId)
  }

  if (!userId) {
    console.error('Could not determine user ID')
    return
  }

  // 2. Ensure profile exists and role is super_admin
  console.log('Updating profile role to super_admin...')
  
  // Give the trigger a moment to create the profile if it was a new user
  await new Promise(r => setTimeout(r, 1000));
  
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', userId)

  if (profileError) {
    console.error('Error updating profile:', profileError)
  } else {
    console.log('✅ Successfully configured Admin account! You can now log in.')
  }
}

createAdmin()
