import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isMock = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')
  const { pathname } = request.nextUrl

  // ─── Bypass: Next.js internals, static files, API routes ────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  // ─── Public routes — always accessible, no auth check ───────────────────
  const publicRoutes = ['/', '/login', '/register', '/register/complete-profile', '/admin-login', '/supplier/pending']
  const isPublicRoute = publicRoutes.some((route) => pathname === route)

  let user: any = null
  let role: string | null = null
  let response = NextResponse.next({ request })

  // ─── Resolve user + role ─────────────────────────────────────────────────
  // ALWAYS check jalseva-mock-session cookie first (works in both mock and real Supabase modes)
  const mockCookie = request.cookies.get('jalseva-mock-session')
  if (mockCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(mockCookie.value))
      user = parsed
      // CRITICAL: read role from cookie, but ONLY if it's a non-empty string
      // The cookie is updated with role AFTER profile completion, so it may be '' for new users
      const cookieRole = parsed.user_metadata?.role
      role = cookieRole && cookieRole !== '' ? cookieRole : null
    } catch {
      user = null
    }
  }

  // If no mock session, try real Supabase (when credentials are present)
  if (!user && !isMock) {
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
    if (supabaseUser) {
      user = supabaseUser
      // ALWAYS query DB for role — never trust stale JWT metadata
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .maybeSingle()
      role = profile?.role || null

      console.log(`[Middleware] Path: ${pathname} | User: ${supabaseUser.id} | Role from DB: ${role}`)
    }
  } else if (user && !isMock) {
    // Has mock cookie but real Supabase — also query DB for role to be safe
    // (role in cookie may be stale)
    try {
      const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll() {} },
      })
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role) role = profile.role
    } catch {}
  }

  console.log(`[Middleware] Path: ${pathname} | HasUser: ${!!user} | Role: ${role} | IsPublic: ${isPublicRoute}`)

  // ─── Helper: redirect preserving auth cookies ────────────────────────────
  const makeRedirect = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c)
    })
    // Also preserve mock session cookie on redirect
    if (mockCookie?.value) {
      redirectResponse.cookies.set('jalseva-mock-session', mockCookie.value, {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      })
    }
    return redirectResponse
  }

  // ─── Guard: unauthenticated users on protected routes ───────────────────
  if (!user && !isPublicRoute) {
    console.log(`[Middleware] REDIRECT: No user → /login`)
    return makeRedirect('/login')
  }

  // ─── Guard: authenticated user with NO role (new user, profile incomplete) ─
  if (user && !role) {
    // Allow staying on public routes and /register/complete-profile
    if (isPublicRoute || pathname === '/register/complete-profile') {
      return response
    }
    // Any other protected route → send to complete profile
    console.log(`[Middleware] REDIRECT: No role → /register/complete-profile`)
    return makeRedirect('/register/complete-profile')
  }

  // ─── Guard: role-based access control ───────────────────────────────────
  if (user && role) {
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      console.log(`[Middleware] REDIRECT: Not admin → dashboard`)
      return makeRedirect(role === 'supplier' ? '/supplier/dashboard' : '/customer/dashboard')
    }

    if (pathname.startsWith('/supplier') && pathname !== '/supplier/pending' && role !== 'supplier') {
      console.log(`[Middleware] REDIRECT: Not supplier → customer/dashboard`)
      return makeRedirect(role === 'super_admin' ? '/admin/dashboard' : '/customer/dashboard')
    }

    if (pathname.startsWith('/customer') && role !== 'customer') {
      console.log(`[Middleware] REDIRECT: Not customer → ${role === 'supplier' ? '/supplier/dashboard' : '/supplier/pending'}`)
      return makeRedirect(role === 'super_admin' ? '/admin/dashboard' : (role === 'supplier' ? '/supplier/dashboard' : '/supplier/pending'))
    }
  }

  return response
}
