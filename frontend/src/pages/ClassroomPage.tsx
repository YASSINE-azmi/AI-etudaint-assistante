import { PageHeader } from '@/components/PageHeader'
import { ShieldCheckIcon } from '@/components/icons'

const CHAPTERS = [
  {
    number: '01',
    title: 'Les ensembles de nombres',
    description:
      'Réels, rationnels, irrationnels, intervalles et opérations. Le vocabulaire et les notations qui structurent tout le programme.',
    objectives: 'Ensembles · intervalles · valeur absolue',
  },
  {
    number: '02',
    title: 'Calcul vectoriel',
    description:
      'Vecteurs, somme, colinéarité et repérage dans le plan. Les outils géométriques du tronc commun.',
    objectives: 'Vecteurs · colinéarité · repérage',
  },
  {
    number: '03',
    title: 'Généralités sur les fonctions',
    description:
      'Domaine, variations, représentation et lecture de courbes. La première approche rigoureuse des fonctions.',
    objectives: 'Domaine · variations · courbes',
  },
]

const GUARANTEES = [
  'Trois chapitres MAXI Maths, en cours de revue par le professeur de mathématiques.',
  'Quatre contrôles serveur prévus : source, périmètre, ancrage, sécurité.',
  'Aucune réponse générée quand la preuve manque.',
]

export function ClassroomPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Semestre 1 · TCS"
        title="Votre espace de mathématiques"
        description="Un tuteur conçu pour répondre uniquement à partir des chapitres de MAXI Maths relus par le relecteur de mathématiques — et pour refuser clairement quand le corpus ne permet pas de répondre."
      />

      <section aria-labelledby="chapters-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="chapters-title" className="font-serif text-2xl text-ink">
              Les trois chapitres retenus
            </h2>
            <p className="mt-1 text-sm text-muted">Périmètre verrouillé pour cette version.</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Corpus en revue
          </p>
        </div>

        <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHAPTERS.map((chapter) => (
            <li key={chapter.number}>
              <article className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-serif text-3xl text-accent/70">{chapter.number}</span>
                  <span className="rounded-full border border-warm/25 bg-warm-soft px-3 py-1 text-xs font-semibold text-warm">
                    À publier
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-2xl leading-tight text-ink">
                  {chapter.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{chapter.description}</p>
                <p className="mt-auto border-t border-line pt-4 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  {chapter.objectives}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside
          aria-labelledby="scope-title"
          className="rounded-2xl border border-line bg-surface p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ShieldCheckIcon className="size-5" />
            </span>
            <h2 id="scope-title" className="font-serif text-xl text-ink">
              Le cadre est verrouillé
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {GUARANTEES.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <section
          aria-labelledby="next-title"
          className="rounded-2xl border border-line bg-accent-soft p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Prochaine étape
          </p>
          <h2 id="next-title" className="mt-3 font-serif text-2xl text-ink">
            Le socle est prêt. Le corpus arrive.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Le socle technique est en place. L’authentification, le transport des réponses et les
            contrôles de sécurité seront branchés avec le corpus, après revue mathématique.
          </p>
          <p aria-hidden="true" className="mt-6 font-serif text-2xl tracking-wide text-accent">
            ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ
          </p>
        </section>
      </div>
    </div>
  )
}
