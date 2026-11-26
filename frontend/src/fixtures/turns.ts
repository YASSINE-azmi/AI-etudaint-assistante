import type { RefusalStatus } from '@/components/chat/RefusalBanner'
import type { Citation, GateResult, RefusalCode, TurnFailure } from '@/lib/api-types'

/**
 * Synthetic data mirroring `backend/app/assistant/turn_fixtures.py` and the French templates in
 * `backend/app/validation/refusal.py` (draft `refusal-fr-v0.1-draft`). Not MAXI Maths content.
 * Used by the dev-only component page and its Playwright tests.
 */

export const ACCEPTED_CITATIONS: Citation[] = [
  {
    claimId: 'c1',
    chunkId: '00000000-0000-4000-8000-0000000000c1',
    revisionId: '00000000-0000-4000-8000-0000000000b1',
    page: 12,
    section: 'Définition (fixture)',
    quote: 'exemple synthétique',
  },
]

/** A malformed payload longer than the 300-character excerpt limit (§22.6). */
export const OVERLONG_CITATION: Citation = {
  claimId: 'c2',
  chunkId: '00000000-0000-4000-8000-0000000000c2',
  revisionId: '00000000-0000-4000-8000-0000000000b1',
  page: 13,
  section: 'Propriété (fixture)',
  quote: 'texte synthétique trop long '.repeat(20).trim(),
}

export const ALL_GATES_PASSED: GateResult[] = [
  { gate: 'source', passed: true },
  { gate: 'scope', passed: true },
  { gate: 'grounding', passed: true },
  { gate: 'math_render', passed: true },
]

/** `out_of_scope_turn`: refused at the scope gate, before retrieval. */
export const OUT_OF_SCOPE_GATES: GateResult[] = [{ gate: 'scope', passed: false }]

export const OUT_OF_SCOPE_MESSAGE_FR =
  "Cette question dépasse le programme du Tronc Commun Scientifique. Choisis une notion d'un chapitre disponible et je t'explique pas à pas."

export const INSUFFICIENT_EVIDENCE_MESSAGE_FR =
  "Le manuel validé ne contient pas assez d'éléments pour répondre à cette question. Reformule-la ou pose une question sur une notion du chapitre."

/** `provider_failure_turn` */
export const PROVIDER_FAILURE: TurnFailure = {
  code: 'PROVIDER_UNAVAILABLE',
  educationalStatus: 'provider_unavailable',
  messageFr:
    'Le service est momentanément indisponible. Ta séance est conservée ; réessaie dans un instant.',
  retryable: true,
}

/** Synthetic: the backend fixtures send no next actions yet. */
export const NEXT_ACTIONS_EXAMPLE = ['Choisir une notion du chapitre', 'Reformuler la question']

type StreamedRefusal = {
  code: RefusalCode
  educationalStatus: RefusalStatus
  delivery: 'refusal' | 'failure'
  messageFr: string
}

/**
 * Every code delivered inside a turn stream, copied from `REFUSALS` in `refusal.py`.
 * `RATE_LIMITED` and `TURN_LIMIT_REACHED` are HTTP 429/409 before any stream, so not here.
 */
export const STREAMED_REFUSALS: StreamedRefusal[] = [
  {
    code: 'OUT_OF_SCOPE_LEVEL',
    educationalStatus: 'outside_scope',
    delivery: 'refusal',
    messageFr: OUT_OF_SCOPE_MESSAGE_FR,
  },
  {
    code: 'OUT_OF_SCOPE_CHAPTER',
    educationalStatus: 'outside_scope',
    delivery: 'refusal',
    messageFr:
      "Ce chapitre n'est pas encore disponible dans cette version. Choisis l'un des chapitres proposés dans la liste.",
  },
  {
    code: 'INSUFFICIENT_EVIDENCE',
    educationalStatus: 'insufficient_evidence',
    delivery: 'refusal',
    messageFr: INSUFFICIENT_EVIDENCE_MESSAGE_FR,
  },
  {
    code: 'AMBIGUOUS_QUESTION',
    educationalStatus: 'clarification_required',
    delivery: 'refusal',
    messageFr:
      "Je ne suis pas sûr de bien lire ta question. Peux-tu préciser l'expression ou le symbole concerné ?",
  },
  {
    code: 'MATH_UNVERIFIABLE',
    educationalStatus: 'validation_failed',
    delivery: 'refusal',
    messageFr:
      "Je n'arrive pas à vérifier ce calcul avec certitude, donc je préfère ne pas répondre. Peux-tu préciser l'énoncé ?",
  },
  {
    code: 'MATH_INCORRECT',
    educationalStatus: 'validation_failed',
    delivery: 'refusal',
    messageFr:
      "La réponse préparée n'a pas passé la vérification mathématique, elle n'est donc pas affichée. Reformule ta question ou essaie une autre notion.",
  },
  {
    code: 'RENDERING_UNSAFE',
    educationalStatus: 'validation_failed',
    delivery: 'refusal',
    messageFr:
      'La réponse contient une notation mathématique qui ne peut pas être affichée correctement. Reformule ta question.',
  },
  {
    code: 'SOURCE_WITHDRAWN',
    educationalStatus: 'source_withdrawn',
    delivery: 'refusal',
    messageFr:
      "La source de cette séance a été retirée. L'historique reste consultable ; ouvre une nouvelle séance pour continuer.",
  },
  {
    code: 'PROVIDER_UNAVAILABLE',
    educationalStatus: 'provider_unavailable',
    delivery: 'failure',
    messageFr: PROVIDER_FAILURE.messageFr,
  },
  {
    code: 'CREDIT_EXHAUSTED',
    educationalStatus: 'credit_exhausted',
    delivery: 'failure',
    messageFr:
      'Les crédits de démonstration sont épuisés. Cette version de démonstration ne peut plus répondre pour le moment.',
  },
]

/** A validated answer with inline and display math (synthetic). */
export const MATH_ANSWER_TEXT =
  'Pour tout réel $x$, on a $|x| \\geq 0$.\n\nPar exemple : $$\\sqrt{4} = 2$$'
