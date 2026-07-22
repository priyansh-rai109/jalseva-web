import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mockSuppliers, mockZones, mockProducts, mockOrders, mockNotifications } from './mock'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isMock = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')
  const cookieStore = await cookies()

  if (isMock) {
    return {
      auth: {
        getUser: async () => {
          const cookie = cookieStore.get('jalseva-mock-session')
          if (!cookie?.value) return { data: { user: null }, error: null }
          try {
            const user = JSON.parse(decodeURIComponent(cookie.value))
            return { data: { user }, error: null }
          } catch {
            return { data: { user: null }, error: null }
          }
        }
      },
      from: (table: string) => {
        const getTableData = () => {
          if (table === 'suppliers') return mockSuppliers
          if (table === 'zones') return mockZones
          if (table === 'water_products') return mockProducts
          if (table === 'orders') return mockOrders
          if (table === 'notifications') return mockNotifications
          if (table === 'profiles') {
            const cookie = cookieStore.get('jalseva-mock-session')
            const role = cookie ? JSON.parse(decodeURIComponent(cookie.value))?.user_metadata?.role || 'customer' : 'customer'
            return [{ id: `${role}-id`, role, name: role === 'super_admin' ? 'Super Admin' : role === 'supplier' ? 'Ramesh Kumar' : 'Vijay Jodhpur', email: `${role}@jalseva.in` }]
          }
          if (table === 'customers') {
            const cookie = cookieStore.get('jalseva-mock-session')
            const user = cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null
            const userId = user?.id || 'customer-id'
            return [{
              id: 'customer-1',
              user_id: userId,
              name: user?.user_metadata?.name || 'Vijay Jodhpur',
              phone: '9876543210',
              email: user?.email || 'customer@jalseva.in',
              addresses: [
                {
                  id: 'addr-1',
                  label: 'Home',
                  line1: 'Mank chowk',
                  city: 'Jodhpur',
                  pincode: '342001',
                  is_default: true
                }
              ]
            }]
          }
          return []
        }

        const data = getTableData()

        const chain = {
          select: (fields?: string, options?: any) => {
            const resolvedData = data.map((item: any) => {
              const copy = { ...item }
              if (table === 'suppliers') {
                copy.zones = mockZones.find(z => z.id === item.zone_id) || null
                copy.water_products = mockProducts.filter(p => p.supplier_id === item.id)
              }
              if (table === 'orders') {
                copy.customers = { name: 'Vijay Jodhpur', phone: '9876543210' }
                copy.suppliers = mockSuppliers.find(s => s.id === item.supplier_id) || mockSuppliers[0]
                copy.water_products = mockProducts.find(p => p.id === item.product_id) || mockProducts[0]
              }
              return copy
            })

            const resultPromise = Promise.resolve({
              data: resolvedData,
              error: null,
              count: resolvedData.length
            }) as any

            resultPromise.eq = () => resultPromise
            resultPromise.in = () => resultPromise
            resultPromise.gte = () => resultPromise
            resultPromise.order = () => resultPromise
            resultPromise.limit = () => resultPromise
            resultPromise.single = () => {
              return Promise.resolve({
                data: resolvedData[0] || null,
                error: resolvedData[0] ? null : { message: 'Not found' }
              })
            }
            resultPromise.maybeSingle = () => {
              return Promise.resolve({
                data: resolvedData[0] || null,
                error: null
              })
            }
            return resultPromise
          },
          insert: (payload: any) => {
            const resultPromise = Promise.resolve({ data: payload, error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: Array.isArray(payload) ? payload[0] : payload, error: null })
            return resultPromise
          },
          upsert: (payload: any) => {
            const resultPromise = Promise.resolve({ data: payload, error: null }) as any
            resultPromise.select = () => resultPromise
            resultPromise.eq = () => resultPromise
            resultPromise.single = () => Promise.resolve({ data: Array.isArray(payload) ? payload[0] : payload, error: null })
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

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cookie set warning bypass
          }
        },
      },
    }
  )
}
