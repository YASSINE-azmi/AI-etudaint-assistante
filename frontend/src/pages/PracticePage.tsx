import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PencilIcon } from '@/components/icons'

const EXERCISE_TYPES = [
  'QCM',
  'Réponse numérique',
  'Expression algébrique',
  'Résolution guidée',
]

export function PracticePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Entraînement"
        title="S’entraîner sur le corpus validé"
        description="Chaque exercice est relu avant publication. La correction vérifie la réponse, pas seulement sa forme."
      />

      <div className="mt-10">
        <EmptyState icon={<PencilIcon className="size-5" />} title="La banque d’exercices arrive après la revue.">
          <p>
            Les exercices seront publiés chapitre par chapitre, avec leurs corrigés et leurs
            indicateurs d’erreur.
          </p>
          <p className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            Types prévus
          </p>
          <ul className="flex flex-wrap gap-2 pt-1">
            {EXERCISE_TYPES.map((type) => (
              <li
                key={type}
                className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-muted"
              >
                {type}
              </li>
            ))}
          </ul>
        </EmptyState>
      </div>
    </div>
  )
}
