import { DefaultChatTransport, type UIMessage } from 'ai'

import type {
  Citation,
  EducationalStatus,
  GateName,
  GateResult,
  RefusalCode,
  TurnFailure,
  TurnFields,
  Usage,
} from '@/lib/api-types'
import { apiUrl, authHeaders, failedResponseError, networkError } from '@/lib/http'

/**
 * Turn stream types and transport (plan §7.2–§7.5, §13.3, Appendix D,
 * `docs/contracts/sse-turn-contract.md`).
 *
 * The backend endpoint is not built yet; the UI tier tests a stream stubbed to Appendix D.
 * TODO(contract): Mohamed's transport must confirm the part names (`turn.started` →
 * `data-turn-started`, …) against the installed `ai` version (contract, open questions).
 */

/** Custom `data-*` parts of the AI SDK UI message stream, keyed without the `data-` prefix. */
export type TurnDataParts = {
  'turn-started': { turnId: string; sessionId: string }
  'retrieval-completed': { chunkIds: string[]; scores: number[] }
  'validation-started': { gates: GateName[] }
  'validation-completed': { gates: GateResult[]; educationalStatus: EducationalStatus }
  /** The text itself arrives as one `text` part; this part carries the rest (contract step 2). */
  'message-final': {
    citations: Citation[]
    refusalCode: RefusalCode | null
    nextActions: string[]
  }
  'turn-completed': { turnId: string; usage: Usage }
  /** §7.2: ends a failed turn and replaces `message.final`, so it carries no answer text. */
  'turn-failed': TurnFailure
}

export type TurnMessage = UIMessage<unknown, TurnDataParts>

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
    fetch: turnFetch,
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
 * Same error handling as `http.ts`: 429/409 rejections before the stream (§7.4) become
 * `ApiError`s, and a 401 ends the session. A caller abort (Stop) is rethrown untouched.
 */
async function turnFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error) {
    if (init?.signal?.aborted) throw error
    throw networkError()
  }
  if (!response.ok) throw await failedResponseError(response)
  return response
}

/** Where a turn stands, from the stream parts received so far (§7.2 event sequence). */
export type TurnPhase =
  | 'submitted'
  | 'retrieving'
  | 'validating'
  | 'final'
  | 'completed'
  | 'failed'

export type TurnView = {
  turnId: string | null
  phase: TurnPhase
  /** Null while validation runs; undefined before it starts. */
  gates: GateResult[] | null | undefined
  educationalStatus: EducationalStatus | null
  /** Validated text only: null until `data-message-final` (§7.2). */
  text: string | null
  citations: Citation[]
  refusalCode: RefusalCode | null
  nextActions: string[]
  failure: TurnFailure | null
}

function lastPart<K extends keyof TurnDataParts>(
  message: TurnMessage,
  name: K,
): TurnDataParts[K] | undefined {
  const part = message.parts.findLast((item) => item.type === `data-${name}`)
  // The `type` check above is what ties this part to `TurnDataParts[K]`.
  return part && 'data' in part ? (part.data as TurnDataParts[K]) : undefined
}

/** Reads an assistant message into what the classroom shows. Pure; no React. */
export function readTurn(message: TurnMessage): TurnView {
  const started = lastPart(message, 'turn-started')
  const validationStarted = lastPart(message, 'validation-started')
  const validation = lastPart(message, 'validation-completed')
  const final = lastPart(message, 'message-final')
  const completed = lastPart(message, 'turn-completed')
  const failure = lastPart(message, 'turn-failed') ?? null

  let phase: TurnPhase = 'submitted'
  if (started) phase = 'retrieving'
  if (validationStarted || validation) phase = 'validating'
  if (final) phase = 'final'
  if (completed) phase = 'completed'
  if (failure) phase = 'failed'

  return {
    turnId: started?.turnId ?? completed?.turnId ?? null,
    phase,
    gates: validation ? validation.gates : validationStarted ? null : undefined,
    educationalStatus: failure?.educationalStatus ?? validation?.educationalStatus ?? null,
    text: failure ? null : validatedText(message),
    citations: final?.citations ?? [],
    refusalCode: final?.refusalCode ?? null,
    nextActions: final?.nextActions ?? [],
    failure,
  }
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
