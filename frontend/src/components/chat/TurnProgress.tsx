import type { TurnPhase } from '@/lib/sse'

// Retrieval and validation states (§7.2 events). Shown as text, announced politely.
const PROGRESS_FR: Partial<Record<TurnPhase, string>> = {
  submitted: 'Envoi de ta question…',
  retrieving: 'Recherche dans le manuel…',
  validating: 'Vérification de la réponse…',
}

export function TurnProgress({ phase }: { phase: TurnPhase }) {
  const label = PROGRESS_FR[phase]
  if (!label) return null

  return (
    <p role="status" data-phase={phase} className="flex items-center gap-2 text-sm text-muted">
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />
      {label}
    </p>
  )
}
