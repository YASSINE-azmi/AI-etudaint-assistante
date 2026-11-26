import { useParams } from 'react-router-dom'

import { Composer } from '@/components/chat/Composer'
import { Transcript } from '@/components/chat/Transcript'
import { useTurnChat } from '@/components/chat/useTurnChat'
import { PageHeader } from '@/components/PageHeader'

function SessionClassroom({ sessionId }: { sessionId: string }) {
  const { messages, busy, error, interrupted, submit, retry, stop } = useTurnChat(sessionId)

  return (
    <div className="mt-8 space-y-6">
      {/*
        TODO(contract): `GET /api/v1/sessions/{id}` (session + validated history, chapter title
        for citations) has no response shape yet. Until it does, the transcript starts empty and
        a reload does not restore it. Owner: Mohamed.
      */}
      <p
        data-testid="history-notice"
        className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted"
      >
        L’historique de cette session ne peut pas encore être rechargé : seuls les échanges de
        cette page sont affichés.
      </p>

      <Transcript
        messages={messages}
        interrupted={interrupted}
        busy={busy}
        onRetry={retry}
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-warm/25 bg-warm-soft px-4 py-3">
          <p className="text-sm font-semibold text-warm">{error.messageFr}</p>
          {error.retryable ? (
            <button
              type="button"
              onClick={retry}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink"
            >
              Réessayer
            </button>
          ) : null}
        </div>
      ) : null}

      <Composer busy={busy} onSubmit={submit} onStop={stop} />
    </div>
  )
}

export function SessionPage() {
  const { id = '' } = useParams()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Session"
        title="Séance de travail"
        description="Pose une question sur le chapitre. Seules les réponses validées par le serveur, avec leurs sources, sont affichées."
      />
      <p className="mt-3 text-xs text-muted">
        Identifiant : <code className="rounded bg-paper px-1.5 py-0.5 text-ink">{id}</code>
      </p>
      {/* Keyed so that switching sessions starts a fresh chat state. */}
      <SessionClassroom key={id} sessionId={id} />
    </div>
  )
}
