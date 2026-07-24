import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isMock = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')
  const { pathname } = request.nextUrl

  // ── Bypass: static assets, API routes, Next internals ──────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  // ── Public routes (no auth required) ───────────────────────────────────
  const publicRoutes = ['/', '/login', '/register', '/register/complete-profile', '/admin-login', '/supplier/pending']
  const isPublicRoute = publicRoutes.some(r => pathname === r)

  let user: any = null
  let role: string | null = null
  let response = NextResponse.next({ request })

  // ── 1. Always try mock session cookie first ──────────────────────────
  //    (used in both mock-env and real Supabase when phone OTP needs bridging)
  const mockCookie = request.cookies.get('jalseva-mock-session')
  if (mockCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(mockCookie.value))
      user = parsed
      // CRITICAL: treat empty string '' same as null — new users have role:'' before completing profile
      const rawRole = parsed.user_metadata?.role
      role = (rawRole && rawRole !== '') ? rawRole : null
    } catch {
      user = null
      role = null
    }
  }

  // ── 2. If no mock cookie and real Supabase configured, use Supabase Auth ─
  if (!user && !isMock) {
    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })

    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (supabaseUser) {
      user = supabaseUser
      // CRITICAL: NEVER trust stale JWT metadata for role — always query DB fresh
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .maybeSingle()
      const rawRole = profile?.role
      role = (rawRole && rawRole !== '') ? rawRole : null
    }
  }

  console.log(`[Middleware] Path: ${pathname} | HasUser: ${!!user} | Role: ${role ?? 'none'} | IsPublic: ${isPublicRoute}`)

  // ── Helper: redirect preserving all cookies ─────────────────────────
  const makeRedirect = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)
    // Copy all current cookies to redirect response
    response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
    // Explicitly preserve mock session on redirect
    if (mockCookie?.value) {
      redirectResponse.cookies.set('jalseva-mock-session', mockCookie.value, {
        path: '/', maxAge: 86400, sameSite: 'lax',
      })
    }
    return redirectResponse
  }

  // ── RULE 1: No user + protected route → /login ──────────────────────
  if (!user && !isPublicRoute) {
    console.log(`[Middleware] DECISION: No user on protected route → redirect /login`)
    return makeRedirect('/login')
  }

  if (user) {
    // ── RULE 2: Authenticated but NO role yet ───────────────────────
    if (!role) {
      if (isPublicRoute || pathname === '/register/complete-profile') {
        console.log(`[Middleware] DECISION: No role, on public/complete-profile → allow`)
        return response
      }
      console.log(`[Middleware] DECISION: No role on protected route → redirect /register/complete-profile`)
      return makeRedirect('/register/complete-profile')
    }

    // ── RULE 3: Has role + on /login or /register → send to dashboard ──
    if (pathname === '/login' || pathname === '/register') {
      if (role === 'super_admin') {
        console.log(`[Middleware] DECISION: Admin on login → /admin/dashboard`)
        return makeRedirect('/admin/dashboard')
      }
      if (role === 'supplier') {
        console.log(`[Middleware] DECISION: Supplier on login → /supplier/dashboard`)
        return makeRedirect('/supplier/dashboard')
      }
      if (role === 'customer') {
        console.log(`[Middleware] DECISION: Customer on login → /customer/dashboard`)
        return makeRedirect('/customer/dashboard')
      }
    }

    // ── RULE 4: Role-based access control ──────────────────────────
    if (pathname.startsWith('/admin') && role !== 'super_admin') {
      const target = role === 'supplier' ? '/supplier/dashboard' : '/customer/dashboard'
      console.log(`[Middleware] DECISION: Non-admin on /admin → ${target}`)
      return makeRedirect(target)
    }

    if (pathname.startsWith('/supplier') && pathname !== '/supplier/pending' && role !== 'supplier') {
      const target = role === 'super_admin' ? '/admin/dashboard' : '/customer/dashboard'
      console.log(`[Middleware] DECISION: Non-supplier on /supplier → ${target}`)
      return makeRedirect(target)
    }

    if (pathname.startsWith('/customer') && role !== 'customer') {
      const target = role === 'super_admin' ? '/admin/dashboard' : (role === 'supplier' ? '/supplier/dashboard' : '/supplier/pending')
      console.log(`[Middleware] DECISION: Non-customer on /customer → ${target}`)
      return makeRedirect(target)
    }
  }

  console.log(`[Middleware] DECISION: Allow → ${pathname}`)
  return response
}
