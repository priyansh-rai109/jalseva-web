const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
  const { data, error } = await adminSupabase.auth.admin.createUser({
    phone: '+919876543211',
    password: 'MockUser123!',
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { role: 'supplier', name: 'Ramesh Kumar', phone: '+919876543211' }
  });
  console.log(error || data.user.id);
}
test();
