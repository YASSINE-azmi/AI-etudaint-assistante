import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { HistoryIcon } from '@/components/icons'

export function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Historique"
        title="Revenir sur vos sessions"
        description="Les échanges validés seront conservés avec leurs citations, pour reprendre exactement là où vous vous êtes arrêté."
      />

      <div className="mt-10">
        <EmptyState
          icon={<HistoryIcon className="size-5" />}
          title="Aucune session enregistrée."
        >
          <p>
            Une fois le tuteur activé, chaque session conservera son chapitre, ses étapes validées et
            les sources consultées.
          </p>
          <p className="pt-2">
            Cette démonstration utilise des profils synthétiques. Aucune donnée d’élève réel n’est
            collectée.
          </p>
        </EmptyState>
      </div>
    </div>
  )
}
