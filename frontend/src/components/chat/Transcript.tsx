import { TurnProgress } from '@/components/chat/TurnProgress'
import { TutorTurn } from '@/components/chat/TutorTurn'
import { readTurn, type TurnMessage } from '@/lib/sse'

type TranscriptProps = {
  messages: TurnMessage[]
  interrupted: ReadonlySet<string>
  busy: boolean
  chapterTitle?: string
  onRetry: () => void
}

function userText(message: TurnMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/** The session's exchanges: student questions as typed, tutor turns validated only. */
export function Transcript({ messages, interrupted, busy, chapterTitle, onRetry }: TranscriptProps) {
  if (messages.length === 0) return null
  const last = messages.at(-1)

  return (
    <ol role="log" aria-label="Échanges de la session" className="space-y-4">
      {messages.map((message) => {
        if (message.role === 'user') {
          // A question stopped before the tutor answered at all.
          const unanswered = interrupted.has(message.id) && message === last
          return (
            <li key={message.id} className="space-y-2">
              <article
                aria-label="Question envoyée"
                className="ml-auto max-w-[85%] rounded-2xl bg-accent-soft px-5 py-3 text-base leading-7 whitespace-pre-line text-ink"
              >
                {userText(message)}
              </article>
              {unanswered ? (
                <p role="status" data-turn-state="interrupted" className="text-sm text-muted">
                  Réponse interrompue. Aucun contenu non validé n’a été affiché.
                </p>
              ) : null}
            </li>
          )
        }
        if (message.role !== 'assistant') return null

        const isLast = message === last
        const retryable = isLast && !busy && readTurn(message).failure?.retryable === true
        return (
          <li key={message.id}>
            <TutorTurn
              message={message}
              interrupted={interrupted.has(message.id)}
              chapterTitle={chapterTitle}
              onRetry={retryable ? onRetry : undefined}
            />
          </li>
        )
      })}
      {/* Sent, but the stream has not started: the SDK creates the tutor message on `start`. */}
      {busy && last?.role === 'user' ? (
        <li>
          <article
            aria-label="Réponse du tuteur"
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <TurnProgress phase="submitted" />
          </article>
        </li>
      ) : null}
    </ol>
  )
}
