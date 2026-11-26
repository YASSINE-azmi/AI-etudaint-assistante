import { useId } from 'react'

import type { GateName, GateResult } from '@/lib/api-types'

// Same order as `validation.started` (SSE contract).
const GATES: { gate: GateName; label: string }[] = [
  { gate: 'source', label: 'Source' },
  { gate: 'scope', label: 'Périmètre' },
  { gate: 'grounding', label: 'Ancrage' },
  { gate: 'math_render', label: 'Maths et rendu' },
]

type GateState = 'passed' | 'failed' | 'pending' | 'skipped'

const STATE_LABELS_FR: Record<GateState, { symbol: string; text: string }> = {
  passed: { symbol: '✓', text: 'validé' },
  failed: { symbol: '✕', text: 'non validé' },
  pending: { symbol: '…', text: 'en cours' },
  skipped: { symbol: '–', text: 'non évalué' },
}

type GateStatusProps = {
  /** Null while validation runs (after `validation.started`, before `validation.completed`). */
  gates: GateResult[] | null
}

function stateOf(gate: GateName, gates: GateResult[] | null): GateState {
  if (gates === null) return 'pending'
  const result = gates.find((item) => item.gate === gate)
  // A turn refused early reports only the gate that stopped it (e.g. scope).
  if (!result) return 'skipped'
  return result.passed ? 'passed' : 'failed'
}

/** Demo indicator of the four server gates (§8): pass/fail only, no internals. */
export function GateStatus({ gates }: GateStatusProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Contrôles serveur
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {GATES.map(({ gate, label }) => {
          const state = stateOf(gate, gates)
          const { symbol, text } = STATE_LABELS_FR[state]
          return (
            <li
              key={gate}
              data-gate={gate}
              data-state={state}
              className={[
                'rounded-full border px-3 py-1 text-xs font-semibold',
                state === 'passed' ? 'border-accent/30 bg-accent-soft text-accent' : '',
                state === 'failed' ? 'border-warm/30 bg-warm-soft text-warm' : '',
                state === 'pending' || state === 'skipped' ? 'border-line bg-surface text-muted' : '',
              ].join(' ')}
            >
              <span aria-hidden="true">{symbol} </span>
              {label} : {text}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
