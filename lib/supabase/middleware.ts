import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isMock = !supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')
  const { pathname } = request.nextUrl

  // ── 1. ALWAYS bypass Next.js internals & static files ─────────────────
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  // ── 2. Fully public routes — no session check at all ──────────────────
  //    These routes ALWAYS render as-is. No redirects of any kind.
  //    (Even if user is logged in, we don't redirect — avoids loop risk)
  const alwaysPublic = [
    '/',
    '/admin-login',
    '/register/complete-profile',
    '/supplier/pending',
  ]
  if (alwaysPublic.includes(pathname)) {
    console.log(`[Middleware] ALLOW (always-public): ${pathname}`)
    return NextResponse.next({ request })
  }

  // ── 3. Read session — try mock cookie first ────────────────────────────
  let user: any = null
  let role: string | null = null
  let response = NextResponse.next({ request })

  const mockCookie = request.cookies.get('jalseva-mock-session')
  if (mockCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(mockCookie.value))
      user = parsed
      const rawRole = parsed.user_metadata?.role
      // Treat empty string as no-role (new users before completing profile)
      role = (rawRole && rawRole !== '') ? rawRole : null
    } catch {
      user = null
      role = null
    }
  }

  // Real Supabase session (only when real credentials configured & no mock cookie)
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

    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser()
      if (supabaseUser) {
        user = supabaseUser
        // Always query DB for role — never trust stale JWT metadata
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', supabaseUser.id)
          .maybeSingle()
        const rawRole = profile?.role
        role = (rawRole && rawRole !== '') ? rawRole : null
      }
    } catch {
      // Auth check failed — treat as unauthenticated
      user = null
      role = null
    }
  }

  console.log(`[Middleware] Path: ${pathname} | User: ${user?.id ?? 'none'} | Role: ${role ?? 'none'}`)

  // ── Helper: build a redirect response preserving cookies ─────────────
  const makeRedirect = (targetPath: string) => {
    // Safety: never redirect to the same path (infinite loop prevention)
    if (targetPath === pathname) {
      console.warn(`[Middleware] LOOP GUARD: tried to redirect ${pathname} → itself, allowing instead`)
      return response
    }
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value, c))
    if (mockCookie?.value) {
      redirectResponse.cookies.set('jalseva-mock-session', mockCookie.value, {
        path: '/', maxAge: 86400, sameSite: 'lax',
      })
    }
    return redirectResponse
  }

  // ── 4. /login and /register: semi-public ──────────────────────────────
  //    No session → show the page (allow)
  //    Has session + role → redirect to dashboard (convenience)
  //    Has session + NO role → allow (they'll be sent to complete-profile by the page itself)
  if (pathname === '/login' || pathname === '/register') {
    if (!user || !role) {
      // Not logged in or incomplete profile → show login/register page
      console.log(`[Middleware] ALLOW (login/register, no complete session): ${pathname}`)
      return response
    }
    // Fully authenticated with role → redirect to correct dashboard
    let target = '/customer/dashboard'
    if (role === 'super_admin') target = '/admin/dashboard'
    else if (role === 'supplier') target = '/supplier/dashboard'
    console.log(`[Middleware] REDIRECT (already authed on login/register) → ${target}`)
    return makeRedirect(target)
  }

  // ── 5. Protected routes: must have a session ─────────────────────────
  if (!user) {
    console.log(`[Middleware] REDIRECT (no session on protected route) → /login`)
    return makeRedirect('/login')
  }

  // ── 6. Authenticated but no role → complete profile ───────────────────
  if (!role) {
    console.log(`[Middleware] REDIRECT (no role on protected route) → /register/complete-profile`)
    return makeRedirect('/register/complete-profile')
  }

  // ── 7. Role-based access control ─────────────────────────────────────
  if (pathname.startsWith('/admin') && role !== 'super_admin') {
    const target = role === 'supplier' ? '/supplier/dashboard' : '/customer/dashboard'
    console.log(`[Middleware] REDIRECT (wrong role for /admin) → ${target}`)
    return makeRedirect(target)
  }

  if (pathname.startsWith('/supplier') && role !== 'supplier') {
    const target = role === 'super_admin' ? '/admin/dashboard' : '/customer/dashboard'
    console.log(`[Middleware] REDIRECT (wrong role for /supplier) → ${target}`)
    return makeRedirect(target)
  }

  if (pathname.startsWith('/customer') && role !== 'customer') {
    const target = role === 'super_admin' ? '/admin/dashboard' : '/supplier/dashboard'
    console.log(`[Middleware] REDIRECT (wrong role for /customer) → ${target}`)
    return makeRedirect(target)
  }

  console.log(`[Middleware] ALLOW → ${pathname}`)
  return response
}
