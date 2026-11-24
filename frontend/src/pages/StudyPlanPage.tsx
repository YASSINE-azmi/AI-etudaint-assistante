import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { CalendarIcon } from '@/components/icons'

const PLANNER_RULES = [
  'Créneaux de 45 minutes maximum, avec des pauses.',
  'Ordre déterminé par les prérequis du programme.',
  'Fuseau Africa/Casablanca, sans chevauchement.',
]

export function StudyPlanPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Organisation"
        title="Planifier la semaine"
        description="Un plan déterministe, construit à partir de vos créneaux et des objectifs publiés — jamais d’objectifs inventés."
      />

      <div className="mt-10">
        <EmptyState
          icon={<CalendarIcon className="size-5" />}
          title="Le planificateur sera activé avec le corpus."
        >
          <p>
            Les objectifs doivent d’abord être revus et publiés. Le plan pourra ensuite être généré,
            modifié et repris d’une semaine à l’autre.
          </p>
          <ul className="grid gap-2 pt-2 sm:grid-cols-3">
            {PLANNER_RULES.map((rule) => (
              <li key={rule} className="rounded-xl border border-line bg-paper p-3 text-xs leading-5">
                {rule}
              </li>
            ))}
          </ul>
        </EmptyState>
      </div>
    </div>
  )
}
