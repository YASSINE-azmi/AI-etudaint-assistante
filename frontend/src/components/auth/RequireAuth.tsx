import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AuthErrorScreen } from '@/components/auth/AuthErrorScreen'
import { useAuth } from '@/components/auth/authContext'

/** Route guard: renders the child routes only for a signed-in student with a loaded profile. */
export function RequireAuth() {
  const { state, retryProfile, signOut } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <main id="main-content" className="flex min-h-dvh items-center justify-center px-6">
        <p role="status" className="text-sm text-muted">
          Chargement de votre profil…
        </p>
      </main>
    )
  }

  if (state.status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (state.status === 'error') {
    return (
      <AuthErrorScreen error={state.error} onRetry={retryProfile} onSignOut={() => void signOut()} />
    )
  }

  return <Outlet />
}
