import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'

import { getSupabase } from '@/lib/supabase'

export const AUTH_MESSAGES_FR = {
  expired: 'Votre session a expiré. Reconnectez-vous.',
  invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.',
  network:
    'Impossible de joindre le service de connexion. Vérifiez votre connexion puis réessayez.',
  rateLimited: 'Trop de tentatives. Patientez un instant puis réessayez.',
  unknown: 'La connexion a échoué. Réessayez dans un instant.',
} as const

// Set while a session exists so that, when Supabase later drops it on its own (refresh
// rejected, API 401), the login screen can say "expired" rather than show a bare form.
const HAD_SESSION_KEY = 'ai-maths:had-session'

export function rememberSession(): void {
  try {
    localStorage.setItem(HAD_SESSION_KEY, '1')
  } catch {
    // Storage blocked: the expiry notice is a convenience only.
  }
}

/** True once if a session existed before this sign-out, then forgets it. */
export function consumeHadSession(): boolean {
  try {
    const had = localStorage.getItem(HAD_SESSION_KEY) === '1'
    localStorage.removeItem(HAD_SESSION_KEY)
    return had
  } catch {
    return false
  }
}

/**
 * Email + password sign-in (§6.1: email only, no Google or SSO).
 * Returns a French error message, or null on success.
 *
 * TODO(contract): password rather than magic link is inferred from
 * `docs/guides/supabase-setup.md`, which disables email confirmation so synthetic accounts work
 * without an inbox. Confirm, and say whether students may self-register. Owner: Mohamed.
 */
export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (!error) return null
  if (isAuthRetryableFetchError(error)) return AUTH_MESSAGES_FR.network
  if (isAuthApiError(error)) {
    if (error.status === 429) return AUTH_MESSAGES_FR.rateLimited
    if (error.code === 'invalid_credentials' || error.status === 400) {
      return AUTH_MESSAGES_FR.invalidCredentials
    }
  }
  return AUTH_MESSAGES_FR.unknown
}

/** Student-initiated logout: revoke the session, and always clear this device. */
export async function signOut(): Promise<void> {
  consumeHadSession()
  const { error } = await getSupabase().auth.signOut()
  if (error) {
    await getSupabase().auth.signOut({ scope: 'local' })
  }
}

/** The API rejected the token: drop it locally; the login screen will say it expired. */
export async function endRejectedSession(): Promise<void> {
  await getSupabase().auth.signOut({ scope: 'local' })
}
