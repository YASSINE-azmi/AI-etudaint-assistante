import { createContext, useContext } from 'react'

import type { Me } from '@/lib/api-types'
import type { ApiError } from '@/lib/http'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out'; expired: boolean }
  | { status: 'signed-in'; me: Me }
  /** Signed in with Supabase, but `/me` failed (403, network, server). */
  | { status: 'error'; error: ApiError }

export type AuthContextValue = {
  state: AuthState
  retryProfile: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
