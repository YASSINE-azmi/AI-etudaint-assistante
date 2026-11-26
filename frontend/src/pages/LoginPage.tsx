import { Link } from 'react-router-dom'

// Week-1 placeholder. The email sign-in form arrives in Week 2 (member-a.md).
// TODO(contract): email + password or magic link for the synthetic demo accounts? Owner: Mohamed.
export function LoginPage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Connexion</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
        La connexion n’est pas encore disponible.
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Cette démonstration utilisera des comptes synthétiques avec une connexion par adresse
        e-mail uniquement. Le formulaire sera ajouté dans une prochaine étape.
      </p>
      <p
        role="status"
        className="mt-6 w-fit rounded-full border border-warm/25 bg-warm-soft px-3 py-1 text-xs font-semibold text-warm"
      >
        Écran provisoire · aucune authentification active
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 w-fit items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink"
      >
        Revenir au cours
      </Link>
    </main>
  )
}
