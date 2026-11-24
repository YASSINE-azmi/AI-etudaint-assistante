import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Erreur 404</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Cette page n’existe pas.</h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Le lien est peut-être obsolète, ou la page n’a pas encore été publiée dans cette version.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink"
      >
        Revenir au cours
      </Link>
    </div>
  )
}
