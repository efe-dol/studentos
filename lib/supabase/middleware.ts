import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const isProd = process.env.NODE_ENV === 'production'

const hardenCookieOptions = <T extends { sameSite?: unknown; secure?: boolean; httpOnly?: boolean; path?: string }>(
  options: T
): T => ({
  ...options,
  sameSite: (options.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
  secure: options.secure ?? isProd,
  path: options.path ?? '/',
})

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, hardenCookieOptions(options ?? {}))
            })
          },
        },
      }
    )

    // Verifizierten Benutzer laden (getUser validiert das JWT serverseitig und
    // erneuert bei Bedarf die Auth-Cookies; getSession vertraut ungeprüft dem Cookie).
    const { data: { user } } = await supabase.auth.getUser()

    let maintenanceMode = false
    const { data: maintenanceSettings } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('id', true)
      .single()

    maintenanceMode = Boolean(maintenanceSettings?.maintenance_mode)

    let profile: { role?: 'user' | 'admin'; is_blocked?: boolean } | null = null
    if (user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_blocked')
        .eq('id', user.id)
        .single()

      if (profileError && String(profileError.message || '').toLowerCase().includes('is_blocked')) {
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        profile = {
          role: fallbackProfile?.role,
          is_blocked: false,
        }
      } else {
        profile = profileData
      }
    }

    const pathname = request.nextUrl.pathname
    const isLoginPage = pathname === '/login'
    const isRegisterPage = pathname === '/register'
    const isHomePage = pathname === '/'
    const isPrivacyPage = pathname === '/privacy'
    const isImpressumPage = pathname === '/impressum'
    const isPublicAssetRoute =
      pathname === '/manifest.webmanifest' ||
      pathname === '/sw.js' ||
      pathname.startsWith('/icon') ||
      pathname.startsWith('/apple-icon')
    const isApiRoute = pathname.startsWith('/api/')
    const isPublicWithoutSession =
      isHomePage ||
      isLoginPage ||
      isRegisterPage ||
      isPrivacyPage ||
      isImpressumPage ||
      isPublicAssetRoute

    if (profile?.is_blocked && !isLoginPage && !isPrivacyPage && !isImpressumPage) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('blocked', '1')
      return NextResponse.redirect(loginUrl)
    }

    if (maintenanceMode && isRegisterPage) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('maintenance', '1')
      return NextResponse.redirect(loginUrl)
    }

    if (user && maintenanceMode && profile?.role !== 'admin' && !isLoginPage && !isPrivacyPage && !isImpressumPage) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('maintenance', '1')
      return NextResponse.redirect(loginUrl)
    }

    // Ohne Session sind /, /privacy, /impressum sowie Login/Register öffentlich (API-Routen sind ausgenommen).
    if (!user && !isPublicWithoutSession && !isApiRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Wenn auf login/register und Session existiert, redirect zu dashboard
    if (
      user &&
      (isLoginPage || isRegisterPage) &&
      !profile?.is_blocked &&
      !(maintenanceMode && profile?.role !== 'admin')
    ) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  } catch {
    console.error('Proxy/session check failed')
  }

  return response
}

