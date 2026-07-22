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
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
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
        .single()
      role = profile?.role || user.user_metadata?.role || (user.email === 'admin@jalseva.in' ? 'super_admin' : 'customer')
    }
  }

  // Not logged in → redirect to login (except public routes)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Role-based access control
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'supplier' ? '/supplier/dashboard' : '/customer/dashboard'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/supplier') && role !== 'supplier') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : '/customer/dashboard'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/customer') && role !== 'customer') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'super_admin' ? '/admin/dashboard' : '/supplier/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from auth pages
    if (pathname === '/login' || pathname === '/register' || pathname === '/admin-login') {
      const url = request.nextUrl.clone()
      if (role === 'super_admin') url.pathname = '/admin/dashboard'
      else if (role === 'supplier') url.pathname = '/supplier/dashboard'
      else url.pathname = '/customer/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next({ request })
}
