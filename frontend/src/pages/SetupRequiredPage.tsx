import type { EnvVarName } from '@/lib/env'

type SetupRequiredPageProps = {
  missing: EnvVarName[]
}

export function SetupRequiredPage({ missing }: SetupRequiredPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Configuration locale
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
        Il manque les variables d’environnement.
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Le client ne démarre pas tant que les valeurs publiques ne sont pas renseignées. Aucun secret
        serveur ne doit être placé dans le fichier frontend.
      </p>

      <section aria-labelledby="missing-title" className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 id="missing-title" className="font-serif text-xl text-ink">
          Variables manquantes
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {missing.map((name) => (
            <li key={name}>
              <code className="rounded-lg border border-line bg-paper px-2.5 py-1 text-sm text-ink">
                {name}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps-title" className="mt-6">
        <h2 id="steps-title" className="font-serif text-xl text-ink">
          Pour démarrer
        </h2>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-muted">
          <li>
            <span className="font-semibold text-ink">1.</span> Copier{' '}
            <code className="rounded bg-paper px-1.5 py-0.5">frontend/.env.example</code> vers{' '}
            <code className="rounded bg-paper px-1.5 py-0.5">frontend/.env</code>.
          </li>
          <li>
            <span className="font-semibold text-ink">2.</span> Renseigner l’URL de l’API et les deux
            clés publiques Supabase.
          </li>
          <li>
            <span className="font-semibold text-ink">3.</span> Relancer{' '}
            <code className="rounded bg-paper px-1.5 py-0.5">pnpm dev</code>.
          </li>
        </ol>
      </section>
    </main>
  )
}
