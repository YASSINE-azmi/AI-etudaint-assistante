import { useId } from 'react'

import { EvidenceExcerpt } from '@/components/chat/EvidenceExcerpt'
import type { Citation } from '@/lib/api-types'

type CitationListProps = {
  citations: Citation[]
  chapterTitle?: string
}

/** Sources of a validated answer. Refusals carry no citations and render nothing. */
export function CitationList({ citations, chapterTitle }: CitationListProps) {
  const titleId = useId()
  if (citations.length === 0) return null

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Sources
      </h3>
      <ol className="mt-2 space-y-2">
        {citations.map((citation, index) => (
          <li key={`${citation.claimId}-${citation.chunkId}-${index}`}>
            <EvidenceExcerpt
              quote={citation.quote}
              page={citation.page}
              section={citation.section}
              chapterTitle={chapterTitle}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
