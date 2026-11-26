import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { HistoryIcon } from '@/components/icons'

// Week-1 placeholder. Loading a session and its validated history arrives in Week 4.
// TODO(contract): `GET /api/v1/sessions/{id}` response shape is not defined yet. Owner: Mohamed.
export function SessionPage() {
  const { id } = useParams()

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Session"
        title="Reprendre une session"
        description="Une session conservera son chapitre et uniquement les étapes validées, avec leurs sources."
      />

      <div className="mt-10">
        <EmptyState
          icon={<HistoryIcon className="size-5" />}
          title="Cette session ne peut pas encore être chargée."
        >
          <p role="status">
            Écran provisoire : aucune donnée n’est récupérée et aucun échange n’est affiché.
          </p>
          {id ? (
            <p>
              Identifiant demandé :{' '}
              <code className="rounded bg-paper px-1.5 py-0.5 text-ink">{id}</code>
            </p>
          ) : null}
          <p className="pt-2">
            <Link to="/history" className="font-semibold text-accent underline-offset-4 hover:underline">
              Voir l’historique
            </Link>
          </p>
        </EmptyState>
      </div>
    </div>
  )
}
