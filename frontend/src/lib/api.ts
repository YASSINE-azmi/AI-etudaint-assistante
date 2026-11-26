import type { Me } from '@/lib/api-types'
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

/** The only product endpoint that exists. Its first call also creates the profile row (§6.1). */
export function getMe(signal?: AbortSignal): Promise<Me> {
  return api.get<Me>('/api/v1/me', { signal })
}

// TODO(contract): curriculum, sessions, exercises, progress, study plan, and media endpoints
// (§7.1) have no OpenAPI schema yet. Add typed calls here when Mohamed publishes them.
