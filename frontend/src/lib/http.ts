import { env } from '@/lib/env'
import { getAccessToken } from '@/lib/supabase'

// Client-side default only; the plan sets no REST timeout (the turn stream has its own, §11.4).
const DEFAULT_TIMEOUT_MS = 15_000

// Client-side codes for failures that never reached the API. Server codes come from §7.6.
const NETWORK_ERROR = 'NETWORK_ERROR'
const TIMEOUT = 'TIMEOUT'

const FALLBACK_MESSAGES_FR: Record<number, string> = {
  0: 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: 'Vous n’avez pas accès à cette ressource.',
  404: 'Élément introuvable.',
  429: 'Trop de demandes. Patientez un instant puis réessayez.',
}
const GENERIC_MESSAGE_FR = 'Une erreur est survenue. Réessayez dans un instant.'

/** Typed API failure. `status` is 0 when the request never got a response. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly messageFr: string
  readonly requestId: string | null

  constructor(status: number, code: string, messageFr: string, requestId: string | null) {
    super(`${status} ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.messageFr = messageFr
    this.requestId = requestId
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

let onUnauthorized: (() => void) | undefined

/** Called on every 401: the API rejected the token, so the session is over (set by auth). */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  onUnauthorized = handler
}

/** A request that never got a response (offline, DNS, CORS, or the client-side timeout). */
export function networkError(timedOut = false): ApiError {
  return new ApiError(0, timedOut ? TIMEOUT : NETWORK_ERROR, FALLBACK_MESSAGES_FR[0], null)
}

/** Turns a non-2xx response into an `ApiError`, ending the session on 401. */
export async function failedResponseError(response: Response): Promise<ApiError> {
  if (response.status === 401) onUnauthorized?.()
  return toApiError(response)
}

export type RequestOptions = {
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

export function apiUrl(path: string): string {
  if (!env.apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  return `${env.apiBaseUrl.replace(/\/+$/, '')}${path}`
}

/** `Authorization` header for the signed-in student; empty when signed out. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json', ...options.headers })
  for (const [name, value] of Object.entries(await authHeaders())) {
    headers.set(name, value)
  }

  let body: string | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(apiUrl(path), { method, headers, body, signal })
  } catch (error) {
    // A caller-initiated abort (e.g. Stop) is not an error to report.
    if (options.signal?.aborted) throw error
    throw networkError(timeout.aborted)
  }

  if (!response.ok) {
    throw await failedResponseError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallback = FALLBACK_MESSAGES_FR[response.status] ?? GENERIC_MESSAGE_FR
  let code = `HTTP_${response.status}`
  let messageFr = fallback
  let requestId = response.headers.get('X-Request-ID')

  // TODO(contract): §7.6 defines `{ code, messageFr, requestId }`, but the backend still returns
  // FastAPI's default `{ detail }`. Owner: Mohamed. Read both until the error body is wired.
  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>
      if (typeof record.code === 'string') code = record.code
      if (typeof record.messageFr === 'string') messageFr = record.messageFr
      if (typeof record.requestId === 'string') requestId = record.requestId
    }
  } catch {
    // Non-JSON error body: keep the French fallback.
  }

  return new ApiError(response.status, code, messageFr, requestId)
}
