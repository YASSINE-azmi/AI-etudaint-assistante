import { DefaultChatTransport, type UIMessage } from 'ai'

import { apiUrl, authHeaders } from '@/lib/http'

/**
 * Turn stream types and transport (plan §7.2–§7.5, §13.3, Appendix C and D).
 *
 * Week-1 skeleton: nothing renders it yet. The backend endpoint is not built, and the part
 * names must be checked against the installed `ai` version with Mohamed (§21).
 */

/** §7.4 */
export type EducationalStatus =
  | 'accepted'
  | 'outside_scope'
  | 'insufficient_evidence'
  | 'clarification_required'
  | 'validation_failed'
  | 'provider_unavailable'
  | 'credit_exhausted'
  | 'source_withdrawn'
  | 'cancelled'

/** Appendix C */
export type RefusalCode =
  | 'OUT_OF_SCOPE_LEVEL'
  | 'OUT_OF_SCOPE_CHAPTER'
  | 'INSUFFICIENT_EVIDENCE'
  | 'AMBIGUOUS_QUESTION'
  | 'MATH_UNVERIFIABLE'
  | 'MATH_INCORRECT'
  | 'RENDERING_UNSAFE'
  | 'SOURCE_WITHDRAWN'
  | 'PROVIDER_UNAVAILABLE'
  | 'CREDIT_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'TURN_LIMIT_REACHED'

/** Appendix D */
export type GateName = 'source' | 'scope' | 'grounding' | 'math_render'

/** §7.3 */
export type Citation = {
  claimId: string
  chunkId: string
  revisionId: string
  page: number
  section: string
  quote: string
}

/** §7.3 */
export type Usage = {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/** Custom `data-*` parts of the AI SDK UI message stream, keyed without the `data-` prefix. */
export type TurnDataParts = {
  'turn-started': { turnId: string; sessionId: string }
  'retrieval-completed': { chunkIds: string[]; scores: number[] }
  'validation-started': { gates: GateName[] }
  'validation-completed': {
    educationalStatus: EducationalStatus
    // TODO(contract): §7.2 lists `gates` here but defines no shape, and Appendix D omits it.
    // Owner: Yassine (draft on `pin-deepseek-models`: `[{ gate, passed }]`, not merged).
    gates?: unknown
  }
  'message-final': {
    citations: Citation[]
    // TODO(contract): §7.3 carries `refusalCode` and `nextActions` on the turn payload, but
    // Appendix D shows only `citations` in this part. Confirm where they travel. Owner: Yassine.
    refusalCode?: RefusalCode | null
    nextActions?: string[]
  }
  'turn-completed': { turnId: string; usage: Usage }
  /** §7.2: ends a failed turn and replaces `message.final`, so it carries no answer text. */
  // TODO(contract): the `data-turn-failed` part name is assumed by analogy; Appendix D does not
  // show it. Owner: Mohamed.
  'turn-failed': {
    code: RefusalCode
    educationalStatus: EducationalStatus
    messageFr: string
    retryable: boolean
  }
}

export type TurnMessage = UIMessage<unknown, TurnDataParts>

/** Turn request fields besides the prompt (§22.3). */
export type TurnFields = {
  // TODO(contract): which fields are required? The session's chapter is fixed at creation
  // (§11.5), so `chapterId` may be redundant on each turn. Owner: Mohamed.
  chapterId?: string
  objectiveId?: string
  // TODO(contract): `options` is covered by `request_hash` (§7.5) but has no defined shape.
  options?: Record<string, unknown>
  mediaAssetId?: string
  confirmedExpression?: string
}

/** What a caller passes as `body` to `sendMessage` / `regenerate`. */
export type TurnSubmission = TurnFields & {
  /** One UUID per student submission, reused on retry of that submission (§7.5, §13.3). */
  idempotencyKey: string
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}

function lastUserText(messages: TurnMessage[]): string {
  const last = messages.findLast((message) => message.role === 'user')
  if (!last) return ''
  return last.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/**
 * AI SDK transport for `POST /api/v1/sessions/{id}/turns`. Sends only the new prompt and its
 * fields, never `useChat`'s message list: the server rebuilds history from validated turns.
 */
export function createTurnTransport(sessionId: string): DefaultChatTransport<TurnMessage> {
  return new DefaultChatTransport<TurnMessage>({
    api: apiUrl(`/api/v1/sessions/${encodeURIComponent(sessionId)}/turns`),
    prepareSendMessagesRequest: async ({ messages, body, headers }) => {
      const { idempotencyKey, ...fields } = (body ?? {}) as Partial<TurnSubmission>
      if (!idempotencyKey) {
        throw new Error('Turn submission is missing its idempotencyKey')
      }
      // Headers returned here replace the SDK's own, so keep the caller's and add ours on top.
      const merged = new Headers(headers)
      for (const [name, value] of Object.entries(await authHeaders())) {
        merged.set(name, value)
      }
      merged.set('Idempotency-Key', idempotencyKey)
      return {
        body: { ...fields, prompt: lastUserText(messages) },
        headers: merged,
      }
    },
  })
}

/**
 * The tutor text to display, or null when the turn has not delivered a validated message.
 * Text counts only once the `data-message-final` part has arrived (§7.2: no raw tokens).
 */
export function validatedText(message: TurnMessage): string | null {
  if (message.role !== 'assistant') return null
  if (!message.parts.some((part) => part.type === 'data-message-final')) return null
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}
