import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/**
 * Validated tutor text with KaTeX math (§13.3, Gate 4 rendering safety §8.6).
 *
 * Delimiters: `$…$` inline and `$$…$$` display, the convention the plan fixes for the corpus
 * (§9.4). TODO(contract): confirm `message.final.text` uses the same delimiters. Owner: Yassine.
 *
 * The server's Gate 4 already refused unsafe notation. This is defence in depth: KaTeX trusts
 * no command (`\href`, `\htmlClass`, …) and throws on any parse error; if any expression
 * fails, the whole message becomes an error state. Raw LaTeX is never shown as an answer.
 */

type Segment = { kind: 'text'; value: string } | { kind: 'math'; value: string; display: boolean }

// `$$…$$` before `$…$`; `\$` is a literal dollar. A lone `$` leaves the text unbalanced.
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^$])+?)\$/g

function splitMath(text: string): Segment[] | null {
  const segments: Segment[] = []
  let cursor = 0
  for (const match of text.matchAll(MATH_PATTERN)) {
    if (match.index > cursor) segments.push({ kind: 'text', value: text.slice(cursor, match.index) })
    const display = match[1] !== undefined
    segments.push({ kind: 'math', value: (match[1] ?? match[2]).trim(), display })
    cursor = match.index + match[0].length
  }
  const rest = text.slice(cursor)
  if (rest.replaceAll('\\$', '').includes('$')) return null
  if (rest) segments.push({ kind: 'text', value: rest })
  return segments
}

type Rendered = { kind: 'text'; value: string } | { kind: 'math'; html: string; display: boolean }

class UntrustedCommand extends Error {}

// With `trust: false` KaTeX draws `\href`, `\url`, `\htmlClass`… in red instead of throwing,
// which would put raw notation on screen. This callback turns any such command into a failure.
function refuseTrust(): boolean {
  throw new UntrustedCommand()
}

function renderSegments(text: string): Rendered[] | null {
  const segments = splitMath(text)
  if (!segments) return null
  try {
    return segments.map((segment) =>
      segment.kind === 'text'
        ? { kind: 'text', value: segment.value.replaceAll('\\$', '$') }
        : {
            kind: 'math',
            display: segment.display,
            html: katex.renderToString(segment.value, {
              displayMode: segment.display,
              throwOnError: true,
              // Strict mode only flags non-standard LaTeX, not unsafe input; refusing on it
              // would add false refusals. Safety comes from `trust: false` and throwOnError.
              strict: 'ignore',
              trust: refuseTrust,
              maxSize: 10,
              maxExpand: 100,
              output: 'htmlAndMathml',
            }),
          },
    )
  } catch {
    return null
  }
}

export function MathText({ text }: { text: string }) {
  const rendered = useMemo(() => renderSegments(text), [text])

  if (!rendered) {
    return (
      <p role="alert" data-math-error className="text-sm font-semibold text-warm">
        Cette réponse contient une notation qui ne peut pas être affichée correctement. Elle
        n’est pas montrée.
      </p>
    )
  }

  return (
    <div className="whitespace-pre-line text-base leading-7 text-ink">
      {rendered.map((part, index) =>
        part.kind === 'text' ? (
          <span key={index}>{part.value}</span>
        ) : (
          // KaTeX output without trusted commands contains no script, link, or raw user HTML.
          <span
            key={index}
            data-math={part.display ? 'display' : 'inline'}
            className={part.display ? 'my-3 block overflow-x-auto' : undefined}
            dangerouslySetInnerHTML={{ __html: part.html }}
          />
        ),
      )}
    </div>
  )
}
