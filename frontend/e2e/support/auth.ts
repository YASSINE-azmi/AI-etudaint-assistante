import type { Page, Request, Route } from '@playwright/test'

// Must match the `webServer.env` values in playwright.config.ts.
export const SUPABASE_URL = 'https://example.supabase.co'
export const API_URL = 'http://127.0.0.1:8000'
// supabase-js default storage key: `sb-<first label of the project host>-auth-token`.
const STORAGE_KEY = 'sb-example-auth-token'
// Mirrors HAD_SESSION_KEY in src/lib/auth.ts.
const HAD_SESSION_KEY = 'ai-maths:had-session'

export const STUDENT = {
  id: '00000000-0000-4000-8000-00000000a001',
  email: 'eleve.demo@example.test',
}

/** Shape of backend `MeResponse` (backend/app/api/auth.py). */
export const STUDENT_ME = {
  id: STUDENT.id,
  email: STUDENT.email,
  role: 'student',
  academic_track: 'TCS',
}

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** A JWT-shaped token; nothing verifies it because every backend call is stubbed. */
export function fakeAccessToken(expiresAt: number): string {
  const header = base64Url({ alg: 'ES256', typ: 'JWT' })
  const payload = base64Url({ sub: STUDENT.id, aud: 'authenticated', exp: expiresAt })
  return `${header}.${payload}.signature`
}

export function fakeSession(expiresInSeconds: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return {
    access_token: fakeAccessToken(expiresAt),
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: expiresInSeconds,
    expires_at: expiresAt,
    user: {
      id: STUDENT.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: STUDENT.email,
      app_metadata: { provider: 'email', role: 'student' },
      user_metadata: {},
      created_at: '2026-11-01T00:00:00Z',
    },
  }
}

/** Puts a stored session in the browser before the app boots, as after an earlier login. */
export async function seedSession(page: Page, session: ReturnType<typeof fakeSession>) {
  await page.addInitScript(
    ([storageKey, flagKey, value]) => {
      localStorage.setItem(storageKey, value)
      localStorage.setItem(flagKey, '1')
    },
    [STORAGE_KEY, HAD_SESSION_KEY, JSON.stringify(session)],
  )
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers':
      request.headers()['access-control-request-headers'] ?? 'authorization, content-type',
    'access-control-expose-headers': 'x-request-id',
  }
}

async function fulfillJson(route: Route, status: number, body?: unknown) {
  await route.fulfill({
    status,
    headers: { ...corsHeaders(route.request()), 'content-type': 'application/json' },
    body: body === undefined ? '' : JSON.stringify(body),
  })
}

type LoginResult = 'success' | 'invalid'

/**
 * Stubs Supabase Auth: refresh is always rejected (an expired session cannot be renewed),
 * logout succeeds, and password login follows `login`. Returns the recorded requests.
 */
export async function mockSupabaseAuth(page: Page, login: LoginResult = 'invalid') {
  const requests: Request[] = []
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(request) })
      return
    }
    requests.push(request)
    const url = new URL(request.url())

    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'password') {
      if (login === 'success') {
        await fulfillJson(route, 200, fakeSession(3600))
      } else {
        await fulfillJson(route, 400, {
          code: 'invalid_credentials',
          error_code: 'invalid_credentials',
          msg: 'Invalid login credentials',
        })
      }
      return
    }
    if (url.pathname.endsWith('/token')) {
      await fulfillJson(route, 400, {
        code: 'refresh_token_not_found',
        error_code: 'refresh_token_not_found',
        msg: 'Invalid Refresh Token: Refresh Token Not Found',
      })
      return
    }
    if (url.pathname.endsWith('/logout')) {
      await fulfillJson(route, 204)
      return
    }
    await fulfillJson(route, 404, { msg: 'not stubbed' })
  })
  return requests
}

type MeResponse = { status: number; body?: unknown } | 'network-error'

/** Stubs `GET /api/v1/me`, answering with `responses` in order (the last one repeats). */
export async function mockMe(page: Page, ...responses: MeResponse[]) {
  const requests: Request[] = []
  await page.route(`${API_URL}/api/v1/me`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(request) })
      return
    }
    requests.push(request)
    const response = responses[Math.min(requests.length, responses.length) - 1]
    if (response === 'network-error') {
      await route.abort('failed')
      return
    }
    await fulfillJson(route, response.status, response.body)
  })
  return requests
}

/** A signed-in student whose `/me` succeeds. */
export async function signInAsStudent(page: Page) {
  await mockSupabaseAuth(page)
  const meRequests = await mockMe(page, { status: 200, body: STUDENT_ME })
  await seedSession(page, fakeSession(3600))
  return meRequests
}
