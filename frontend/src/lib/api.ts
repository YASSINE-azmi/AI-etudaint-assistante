import { request, type RequestOptions } from '@/lib/http'

type Options = Omit<RequestOptions, 'body'>

export const api = {
  get: <T>(path: string, options?: Options) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: Options) => request<T>('DELETE', path, options),
}

export type Role = 'student' | 'reviewer' | 'admin'

/**
 * Mirrors `MeResponse` in `backend/app/api/auth.py`, the only product endpoint that exists.
 *
 * TODO(contract): the backend returns snake_case (`academic_track`) while §7.3 payloads are
 * camelCase; confirm the casing rule for REST bodies. Owner: Mohamed.
 * TODO(contract): `PATCH /api/v1/me` (display name, preferences, §7.1) has no field list yet.
 */
export type Me = {
  id: string
  email: string | null
  role: Role
  academic_track: string
}

export function getMe(signal?: AbortSignal): Promise<Me> {
  return api.get<Me>('/api/v1/me', { signal })
}

// TODO(contract): curriculum, sessions, exercises, progress, study plan, and media endpoints
// (§7.1) have no OpenAPI schema yet. Add typed calls here when Mohamed publishes them (Week 2).
