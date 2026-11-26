import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { AuthContext, type AuthState } from '@/components/auth/authContext'
import { getMe } from '@/lib/api'
import {
  consumeHadSession,
  endRejectedSession,
  rememberSession,
  signOut as signOutFromSupabase,
} from '@/lib/auth'
import { ApiError, setUnauthorizedHandler } from '@/lib/http'
import { getSupabase } from '@/lib/supabase'

/**
 * Owns the student's session: Supabase sign-in state plus the `/me` profile. The app waits for
 * `/me` because its first call creates the profile row other endpoints rely on (§6.1).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const userId = useRef<string | null>(null)

  const loadProfile = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      setState({ status: 'signed-in', me: await getMe() })
    } catch (error) {
      if (!(error instanceof ApiError)) throw error
      // A 401 already went through the unauthorized handler, which ends the session.
      if (error.status !== 401) setState({ status: 'error', error })
    }
  }, [])

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      // Supabase must not be called from inside this callback, so defer the work.
      setTimeout(() => {
        if (!session) {
          userId.current = null
          // A rejected refresh emits SIGNED_OUT then INITIAL_SESSION; keep the first verdict.
          const hadSession = consumeHadSession()
          setState((previous) => ({
            status: 'signed-out',
            expired: hadSession || (previous.status === 'signed-out' && previous.expired),
          }))
          return
        }
        // Token refreshes and tab refocus re-emit the same user; load the profile once.
        if (session.user.id === userId.current) return
        userId.current = session.user.id
        rememberSession()
        void loadProfile()
      }, 0)
    })
    setUnauthorizedHandler(() => void endRejectedSession())

    return () => {
      data.subscription.unsubscribe()
      setUnauthorizedHandler(undefined)
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      state,
      retryProfile: () => void loadProfile(),
      signOut: signOutFromSupabase,
    }),
    [state, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
