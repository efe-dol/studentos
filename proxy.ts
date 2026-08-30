import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_WINDOW_SECONDS = 60
const API_LIMIT_PER_WINDOW = 120
const SENSITIVE_LIMIT_PER_WINDOW = 20

const SENSITIVE_API_PREFIXES = [
  '/api/notifications/process',
  '/api/push-subscriptions',
  '/api/admin/check',
  '/api/admin/users',
  '/api/account',
  '/api/auth/register',
  '/api/maintenance-mode',
]

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const globalRateLimitStore =
  (globalThis as typeof globalThis & { __studentosRateLimitStore?: Map<string, RateLimitEntry> })
    .__studentosRateLimitStore || new Map<string, RateLimitEntry>()

;(globalThis as typeof globalThis & { __studentosRateLimitStore?: Map<string, RateLimitEntry> }).__studentosRateLimitStore =
  globalRateLimitStore

const getClientIp = (request: NextRequest) => {
  // Prefer headers set by the hosting proxy itself (x-real-ip / cf-connecting-ip):
  // the left-most x-forwarded-for entry is client-supplied and trivially spoofable,
  // which would let an attacker rotate fake IPs to sidestep the rate limit.
  const realIp = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip')
  if (realIp) {
    return realIp.trim()
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}

const tooManyRequests = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfterSeconds)) } }
  )

// In-memory limiter: fast per-instance first line of defence.
const applyMemoryRateLimit = (request: NextRequest) => {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) return null

  const isSensitive = SENSITIVE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const maxRequests = isSensitive ? SENSITIVE_LIMIT_PER_WINDOW : API_LIMIT_PER_WINDOW
  const bucket = `${getClientIp(request)}:${isSensitive ? 'sensitive' : 'api'}`
  const now = Date.now()

  const existing = globalRateLimitStore.get(bucket)
  if (!existing || now >= existing.resetAt) {
    globalRateLimitStore.set(bucket, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return null
  }

  existing.count += 1
  if (existing.count > maxRequests) {
    return tooManyRequests(Math.ceil((existing.resetAt - now) / 1000))
  }
  return null
}

// Durable limiter (shared across serverless instances) via a Postgres RPC.
// Only used for the low-traffic "sensitive" endpoints. Fails open so a DB
// hiccup cannot lock admins out.
const applyDbRateLimit = async (request: NextRequest): Promise<NextResponse | null> => {
  const { pathname } = request.nextUrl
  if (!SENSITIVE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const prefix = SENSITIVE_API_PREFIXES.find((p) => pathname.startsWith(p)) || pathname
  const bucket = `${getClientIp(request)}:${prefix}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        max_hits: SENSITIVE_LIMIT_PER_WINDOW,
        window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) return null // fail open
    const allowed = await res.json()
    if (allowed === false) {
      return tooManyRequests(RATE_LIMIT_WINDOW_SECONDS)
    }
    return null
  } catch {
    return null // fail open on timeout / network error
  } finally {
    clearTimeout(timeout)
  }
}

// Lightweight CSRF defence: a browser always sends Origin on cross-origin
// state-changing requests. If Origin is present and does not match the host,
// reject. Non-browser callers (curl, CI cron) usually omit Origin and still
// need valid auth, so they are unaffected.
const isCrossSiteWrite = (request: NextRequest) => {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) return false
  if (!MUTATING_METHODS.has(request.method)) return false

  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return new URL(origin).host !== request.headers.get('host')
  } catch {
    return true
  }
}

export async function proxy(request: NextRequest) {
  if (isCrossSiteWrite(request)) {
    return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
  }

  const memoryLimited = applyMemoryRateLimit(request)
  if (memoryLimited) return memoryLimited

  const dbLimited = await applyDbRateLimit(request)
  if (dbLimited) return dbLimited

  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
