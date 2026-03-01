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

    if (profile?.is_blocked) {
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('blocked', '1')
      return NextResponse.redirect(loginUrl)
    }

    if (maintenanceMode && request.nextUrl.pathname === '/register') {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('maintenance', '1')
      return NextResponse.redirect(loginUrl)
    }

    if (session && maintenanceMode && profile?.role !== 'admin') {
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('maintenance', '1')
      return NextResponse.redirect(loginUrl)
    }

    // Wenn auf protected routes und keine Session, redirect zu login
    if (!session && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/auth'))) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    // Wenn auf login/register und Session existiert, redirect zu dashboard
    if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }

  return response
}

