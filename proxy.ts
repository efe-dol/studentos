import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const API_LIMIT_PER_WINDOW = 120
const SENSITIVE_LIMIT_PER_WINDOW = 20

const SENSITIVE_API_PREFIXES = [
  '/api/notifications/process',
  '/api/push-subscriptions',
  '/api/admin/check',
]

const globalRateLimitStore =
  (globalThis as typeof globalThis & { __studentosRateLimitStore?: Map<string, RateLimitEntry> })
    .__studentosRateLimitStore || new Map<string, RateLimitEntry>()

;(globalThis as typeof globalThis & { __studentosRateLimitStore?: Map<string, RateLimitEntry> }).__studentosRateLimitStore =
  globalRateLimitStore

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown'
}

const applyRateLimit = (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return null
  }

  const isSensitive = SENSITIVE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const maxRequests = isSensitive ? SENSITIVE_LIMIT_PER_WINDOW : API_LIMIT_PER_WINDOW
  const clientIp = getClientIp(request)
  const bucket = `${clientIp}:${isSensitive ? 'sensitive' : 'api'}`
  const now = Date.now()

  const existing = globalRateLimitStore.get(bucket)
  if (!existing || now >= existing.resetAt) {
    globalRateLimitStore.set(bucket, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return null
  }

  existing.count += 1

  if (existing.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    )
  }

  return null
}

export async function proxy(request: NextRequest) {
  const rateLimitedResponse = applyRateLimit(request)
  if (rateLimitedResponse) {
    return rateLimitedResponse
  }

  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
