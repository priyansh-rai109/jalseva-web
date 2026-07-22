import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isMock = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')
  const { pathname } = request.nextUrl

  // Bypass middleware for internal Next.js requests, static files, API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  // Public routes — always accessible
  const publicRoutes = ['/', '/login', '/register', '/admin-login']
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith('/api/')
  )

  let user: any = null
  let role: string | null = null
  let response = NextResponse.next({ request })

  if (isMock) {
    // Read user from mock session cookie
    const cookie = request.cookies.get('jalseva-mock-session')
    if (cookie?.value) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value))
        user = parsed
        role = parsed.user_metadata?.role || 'customer'
      } catch {
        user = null
      }
    }
  } else {
    // Real Supabase session update
    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    user = supabaseUser

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      role = profile?.role || null
    }
  }

  // Helper function: preserve response auth cookies on redirects
  const makeRedirect = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c)
    })
    return redirectResponse
  }

  // Not logged in → redirect to login (except public routes)
  if (!user && !isPublicRoute) {
    return makeRedirect('/login')
  }

  if (user) {
    // Role-based access control
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      return makeRedirect(role === 'supplier' ? '/supplier/dashboard' : '/customer/dashboard')
    }

    if (pathname.startsWith('/supplier') && role !== 'supplier') {
      return makeRedirect(role === 'super_admin' ? '/admin/dashboard' : '/customer/dashboard')
    }

    if (pathname.startsWith('/customer') && role !== 'customer') {
      return makeRedirect(role === 'super_admin' ? '/admin/dashboard' : '/supplier/dashboard')
    }
  }

  return response
}
