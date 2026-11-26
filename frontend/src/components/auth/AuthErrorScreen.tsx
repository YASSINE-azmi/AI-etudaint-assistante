import type { ApiError } from '@/lib/http'

type AuthErrorScreenProps = {
  error: ApiError
  onRetry: () => void
  onSignOut: () => void
}

function titleFor(error: ApiError): string {
  if (error.status === 403) return 'Accès refusé.'
  if (error.isNetworkError) return 'Connexion au serveur impossible.'
  return 'Votre profil n’a pas pu être chargé.'
}

/** Shown when Supabase has a session but `/me` failed with anything other than 401. */
export function AuthErrorScreen({ error, onRetry, onSignOut }: AuthErrorScreenProps) {
  const canRetry = error.status !== 403

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16"
    >
      <div role="alert">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warm">
          Profil indisponible
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">{titleFor(error)}</h1>
        <p className="mt-4 text-base leading-7 text-muted">{error.messageFr}</p>
      </div>
      {error.requestId ? (
        <p className="mt-3 text-xs text-muted">
          Référence : <code className="rounded bg-paper px-1.5 py-0.5">{error.requestId}</code>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        {canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink"
          >
            Réessayer
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink hover:bg-paper"
        >
          Se déconnecter
        </button>
      </div>
    </main>
  )
}
