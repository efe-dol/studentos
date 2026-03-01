import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Erhalte die aktuelle Session
    const { data: { session } } = await supabase.auth.getSession()

    let maintenanceMode = false
    const { data: maintenanceSettings } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('id', true)
      .single()

    maintenanceMode = Boolean(maintenanceSettings?.maintenance_mode)

    let profile: { role?: 'user' | 'admin'; is_blocked?: boolean } | null = null
    if (session?.user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_blocked')
        .eq('id', session.user.id)
        .single()

      if (profileError && String(profileError.message || '').toLowerCase().includes('is_blocked')) {
        const { data: fallbackProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
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

    if (profile?.is_blocked && !isLoginPage) {
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

    if (session && maintenanceMode && profile?.role !== 'admin' && !isLoginPage) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('maintenance', '1')
      return NextResponse.redirect(loginUrl)
    }

    // Wenn auf protected routes und keine Session, redirect zu login
    if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/auth'))) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Wenn auf login/register und Session existiert, redirect zu dashboard
    if (
      session &&
      (isLoginPage || isRegisterPage) &&
      !profile?.is_blocked &&
      !(maintenanceMode && profile?.role !== 'admin')
    ) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }

  return response
}

