import { useEffect, useState, type SubmitEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router-dom'

import { useAuth } from '@/components/auth/authContext'
import { AUTH_MESSAGES_FR, signInWithEmail } from '@/lib/auth'

function redirectTarget(location: Location): string {
  const from = (location.state as { from?: Location } | null)?.from
  return from ? `${from.pathname}${from.search}` : '/'
}

export function LoginPage() {
  const { state } = useAuth()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Se connecter — Tuteur de mathématiques — TCS'
  }, [])

  // Signed in (or signed in with a profile error, which the guarded routes display).
  if (state.status === 'signed-in' || state.status === 'error') {
    return <Navigate to={redirectTarget(location)} replace />
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError(null)
    const message = await signInWithEmail(String(form.get('email')), String(form.get('password')))
    // On success the auth provider takes over and this page redirects.
    setError(message)
    setSubmitting(false)
  }

  const expired = state.status === 'signed-out' && state.expired

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Connexion</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">Se connecter</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Démonstration académique : comptes synthétiques, connexion par adresse e-mail uniquement.
      </p>

      {expired ? (
        <p
          role="status"
          className="mt-6 rounded-xl border border-warm/25 bg-warm-soft px-4 py-3 text-sm font-semibold text-warm"
        >
          {AUTH_MESSAGES_FR.expired}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-ink">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className="mt-2 block min-h-11 w-full rounded-xl border border-control bg-surface px-3 text-ink focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-ink">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className="mt-2 block min-h-11 w-full rounded-xl border border-control bg-surface px-3 text-ink focus:border-accent"
          />
        </div>

        {error ? (
          <p id="login-error" role="alert" className="text-sm font-semibold text-warm">
            {error}
          </p>
        ) : null}

        {/* `aria-disabled` while submitting: a disabled button drops keyboard focus to <body>. */}
        <button
          type="submit"
          disabled={state.status === 'loading'}
          aria-disabled={submitting || undefined}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink disabled:opacity-60 aria-disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
