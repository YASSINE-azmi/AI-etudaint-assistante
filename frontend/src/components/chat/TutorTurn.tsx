import { CitationList } from '@/components/chat/CitationList'
import { GateStatus } from '@/components/chat/GateStatus'
import { RefusalBanner, type RefusalStatus } from '@/components/chat/RefusalBanner'
import { TurnProgress } from '@/components/chat/TurnProgress'
import { MathText } from '@/components/math/MathText'
import { readTurn, type TurnMessage } from '@/lib/sse'

type TutorTurnProps = {
  message: TurnMessage
  /** Stopped by the student before a validated message arrived: nothing from it is shown. */
  interrupted: boolean
  chapterTitle?: string
  /** Offered only for a retryable failure on the latest turn (§7.5: same Idempotency-Key). */
  onRetry?: () => void
}

function TurnBody({ message, interrupted, chapterTitle, onRetry }: TutorTurnProps) {
  const turn = readTurn(message)

  if (interrupted) {
    return (
      <p role="status" data-turn-state="interrupted" className="text-sm text-muted">
        Réponse interrompue. Aucun contenu non validé n’a été affiché.
      </p>
    )
  }

  if (turn.failure) {
    return (
      <div data-turn-state="failed" className="space-y-3">
        <RefusalBanner
          educationalStatus={turn.failure.educationalStatus as RefusalStatus}
          code={turn.failure.code}
          messageFr={turn.failure.messageFr}
        />
        {turn.failure.retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink"
          >
            Réessayer
          </button>
        ) : null}
      </div>
    )
  }

  if (turn.text === null) {
    return (
      <div data-turn-state="pending" className="space-y-3">
        <TurnProgress phase={turn.phase} />
        {turn.gates !== undefined ? <GateStatus gates={turn.gates} /> : null}
      </div>
    )
  }

  const accepted =
    turn.refusalCode === null &&
    (turn.educationalStatus === null || turn.educationalStatus === 'accepted')
  if (accepted) {
    return (
      <div data-turn-state="accepted" className="space-y-4">
        {turn.gates ? <GateStatus gates={turn.gates} /> : null}
        <MathText text={turn.text} />
        <CitationList citations={turn.citations} chapterTitle={chapterTitle} />
      </div>
    )
  }

  // A refusal is a completed turn whose text is the server's French template (§7.4).
  if (turn.refusalCode && turn.educationalStatus && turn.educationalStatus !== 'accepted') {
    return (
      <div data-turn-state="refused" className="space-y-3">
        {turn.gates ? <GateStatus gates={turn.gates} /> : null}
        <RefusalBanner
          educationalStatus={turn.educationalStatus}
          code={turn.refusalCode}
          messageFr={turn.text}
          nextActions={turn.nextActions}
        />
      </div>
    )
  }

  // Status and code disagree: show nothing from the payload rather than guess.
  return (
    <p role="alert" data-turn-state="inconsistent" className="text-sm font-semibold text-warm">
      La réponse reçue est incomplète. Elle n’est pas affichée.
    </p>
  )
}

export function TutorTurn(props: TutorTurnProps) {
  return (
    <article aria-label="Réponse du tuteur" className="rounded-2xl border border-line bg-surface p-5">
      <TurnBody {...props} />
    </article>
  )
}
