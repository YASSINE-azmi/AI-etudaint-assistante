// §22.6: excerpts are at most 300 characters. The server enforces it; this guard keeps a
// malformed payload from ever putting a full textbook chunk on screen.
const MAX_EXCERPT_CHARS = 300

function shortQuote(quote: string): string {
  return quote.length <= MAX_EXCERPT_CHARS ? quote : `${quote.slice(0, MAX_EXCERPT_CHARS - 1)}…`
}

type EvidenceExcerptProps = {
  quote: string
  page: number
  section: string
  /** Citations carry no chapter; it comes from the session, which is fixed to one (§11.5). */
  chapterTitle?: string
}

/** One short MAXI Maths excerpt with its chapter, section, and page (§13.3). */
export function EvidenceExcerpt({ quote, page, section, chapterTitle }: EvidenceExcerptProps) {
  const reference = [chapterTitle, section, `p. ${page}`].filter(Boolean).join(' · ')

  return (
    <figure className="rounded-xl border border-line bg-surface px-4 py-3">
      <blockquote className="text-sm leading-6 text-ink">« {shortQuote(quote)} »</blockquote>
      <figcaption className="mt-2 text-xs text-muted">MAXI Maths — {reference}</figcaption>
    </figure>
  )
}
