import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const isMock = !supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')

  if (isMock) {
    // Return a synchronous mock client that simulates successful DB operations
    return {
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
          updateUserById: async () => ({ data: { user: {} }, error: null })
        }
      },
      from: (table: string) => {
        const chain = {
          select: () => {
            const resultPromise = Promise.resolve({ data: [], error: null, count: 0 }) as any
            resultPromise.eq = () => resultPromise
            resultPromise.in = () => resultPromise
            resultPromise.order = () => resultPromise
            resultPromise.limit = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: null, error: { message: 'Not found' } })
            resultPromise.maybeSingle = () => Promise.resolve({ data: null, error: null })
            return resultPromise
          },
          insert: (payload: any) => {
            const wrap = (p: any) => ({ id: `mock-${Math.random().toString(36).substring(2, 9)}`, ...p })
            const data = Array.isArray(payload) ? payload.map(wrap) : wrap(payload)
            const resultPromise = Promise.resolve({ data, error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })
            return resultPromise
          },
          upsert: (payload: any) => {
            const wrap = (p: any) => ({ id: `mock-${Math.random().toString(36).substring(2, 9)}`, ...p })
            const data = Array.isArray(payload) ? payload.map(wrap) : wrap(payload)
            const resultPromise = Promise.resolve({ data, error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error: null })
            return resultPromise
          },
          update: (payload: any) => {
            const resultPromise = Promise.resolve({ data: payload, error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: Array.isArray(payload) ? payload[0] : payload, error: null })
            return resultPromise
          },
          delete: () => {
            const resultPromise = Promise.resolve({ data: [], error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: null, error: null })
            return resultPromise
          }
        }
        return chain
      }
    } as any
  }

  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
