import { useId } from 'react'

import type { EducationalStatus, RefusalCode } from '@/lib/api-types'

export type RefusalStatus = Exclude<EducationalStatus, 'accepted'>

// Short UI headings; the explanation itself is always the server's French text.
const TITLES_FR: Record<RefusalStatus, string> = {
  outside_scope: 'Hors du programme',
  insufficient_evidence: 'Le manuel ne suffit pas pour répondre',
  clarification_required: 'Une précision est nécessaire',
  validation_failed: 'Réponse non validée',
  source_withdrawn: 'Source retirée',
  provider_unavailable: 'Service momentanément indisponible',
  credit_exhausted: 'Crédits de démonstration épuisés',
  cancelled: 'Échange interrompu',
}

type RefusalBannerProps = {
  educationalStatus: RefusalStatus
  /** Null for a cancelled turn, which carries no code (§7.4). */
  code: RefusalCode | null
  /** The server's French template (`message.final.text` or `turn.failed.messageFr`). */
  messageFr: string
  // TODO(contract): `nextActions` is `list[str]`; are these French labels to display or action
  // identifiers the UI should map to buttons? Shown as text until decided. Owner: Yassine.
  nextActions?: string[]
}

/** A refusal or failed turn (§8.7, §13.3): French message, code, and next actions. */
export function RefusalBanner({
  educationalStatus,
  code,
  messageFr,
  nextActions = [],
}: RefusalBannerProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      data-educational-status={educationalStatus}
      className="rounded-2xl border border-warm/25 bg-warm-soft px-5 py-4"
    >
      <h3 id={titleId} className="font-serif text-lg text-ink">
        {TITLES_FR[educationalStatus]}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink">{messageFr}</p>

      {nextActions.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Que faire ensuite ?
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
            {nextActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {code ? (
        <p className="mt-3 text-xs text-muted">
          Code : <code className="rounded bg-surface px-1.5 py-0.5 text-ink">{code}</code>
        </p>
      ) : null}
    </section>
  )
}
