import type { Page } from '@playwright/test'

/**
 * UI-tier stub of `POST /api/v1/sessions/{id}/turns` (§13.4: "interruption of a stubbed
 * stream"). The endpoint is not built yet; every part below follows the wire format written in
 * plan Appendix D and `docs/contracts/sse-turn-contract.md`. It proves the client against that
 * contract, not the integration.
 *
 * Playwright's `route.fulfill` sends a body in one piece, so the stream is replaced in the page
 * by a `ReadableStream` the test feeds part by part.
 */

export type StreamPart = Record<string, unknown>

type QueuedReply = { status: number; body: unknown } | 'network-error'

export async function installTurnStream(page: Page) {
  await page.addInitScript(() => {
    type Entry = { controller: ReadableStreamDefaultController<Uint8Array>; aborted: boolean }
    const state = {
      requests: [] as { headers: Record<string, string>; body: unknown }[],
      streams: [] as Entry[],
      replies: [] as ({ status: number; body: unknown } | 'network-error')[],
    }
    Object.assign(window, { __turns: state })
    const realFetch = window.fetch.bind(window)

    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      if (!/\/api\/v1\/sessions\/[^/]+\/turns$/.test(url) || init?.method !== 'POST') {
        return realFetch(input, init)
      }
      state.requests.push({
        headers: Object.fromEntries(new Headers(init.headers).entries()),
        body: JSON.parse(String(init.body)),
      })

      const reply = state.replies.shift()
      if (reply === 'network-error') throw new TypeError('Failed to fetch')
      if (reply) {
        return new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { 'content-type': 'application/json' },
        })
      }

      let entry!: Entry
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          entry = { controller, aborted: false }
        },
      })
      state.streams.push(entry)
      init.signal?.addEventListener('abort', () => {
        entry.aborted = true
        try {
          entry.controller.error(new DOMException('Aborted', 'AbortError'))
        } catch {
          // Already closed.
        }
      })
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
        },
      })
    }
  })
}

/** The next turn request gets this HTTP reply (or a network failure) instead of a stream. */
export async function queueTurnReply(page: Page, reply: QueuedReply) {
  await page.evaluate((value) => {
    ;(window as unknown as { __turns: { replies: unknown[] } }).__turns.replies.push(value)
  }, reply)
}

/** Sends parts on stream `index` (0 = first turn). Returns false if the stream was aborted. */
export async function pushParts(page: Page, index: number, parts: (StreamPart | '[DONE]')[]) {
  // The request leaves after an async token read: wait until this turn's stream exists.
  await page.waitForFunction(
    (streamIndex) =>
      (window as unknown as { __turns: { streams: unknown[] } }).__turns.streams.length >
      streamIndex,
    index,
  )
  return page.evaluate(
    ([streamIndex, items]) => {
      const turns = (window as unknown as { __turns: { streams: { controller: ReadableStreamDefaultController<Uint8Array>; aborted: boolean }[] } }).__turns
      const entry = turns.streams[streamIndex]
      if (entry.aborted) return false
      const encoder = new TextEncoder()
      for (const item of items) {
        const line = item === '[DONE]' ? '[DONE]' : JSON.stringify(item)
        entry.controller.enqueue(encoder.encode(`data: ${line}\n\n`))
        if (item === '[DONE]') entry.controller.close()
      }
      return true
    },
    [index, parts] as const,
  )
}

export async function turnRequests(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __turns: { requests: { headers: Record<string, string>; body: unknown }[] } }).__turns.requests,
  )
}

export async function streamCount(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __turns: { streams: unknown[] } }).__turns.streams.length,
  )
}

export async function abortedStreams(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __turns: { streams: { aborted: boolean }[] } }).__turns.streams.filter(
        (entry) => entry.aborted,
      ).length,
  )
}

// ----- Appendix D parts --------------------------------------------------------------------

export const TURN_ID = '00000000-0000-4000-8000-00000000d001'
export const SESSION_ID = '00000000-0000-4000-8000-00000000e001'

export const parts = {
  start: (turnId = TURN_ID): StreamPart => ({ type: 'start', messageId: turnId }),
  turnStarted: (turnId = TURN_ID): StreamPart => ({
    type: 'data-turn-started',
    data: { turnId, sessionId: SESSION_ID },
  }),
  retrievalCompleted: (): StreamPart => ({
    type: 'data-retrieval-completed',
    data: { chunkIds: ['00000000-0000-4000-8000-0000000000c1'], scores: [0.82] },
  }),
  validationStarted: (): StreamPart => ({
    type: 'data-validation-started',
    data: { gates: ['source', 'scope', 'grounding', 'math_render'] },
  }),
  validationCompleted: (
    educationalStatus: string,
    gates: { gate: string; passed: boolean }[],
  ): StreamPart => ({ type: 'data-validation-completed', data: { gates, educationalStatus } }),
  text: (text: string): StreamPart[] => [
    { type: 'text-start', id: 't1' },
    { type: 'text-delta', id: 't1', delta: text },
    { type: 'text-end', id: 't1' },
  ],
  messageFinal: (
    citations: unknown[],
    refusalCode: string | null = null,
    nextActions: string[] = [],
  ): StreamPart => ({ type: 'data-message-final', data: { citations, refusalCode, nextActions } }),
  turnCompleted: (turnId = TURN_ID): StreamPart => ({
    type: 'data-turn-completed',
    data: { turnId, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } },
  }),
  turnFailed: (failure: {
    code: string
    educationalStatus: string
    messageFr: string
    retryable: boolean
  }): StreamPart => ({ type: 'data-turn-failed', data: failure }),
  finish: (): StreamPart => ({ type: 'finish' }),
}

export const ALL_GATES_PASSED = [
  { gate: 'source', passed: true },
  { gate: 'scope', passed: true },
  { gate: 'grounding', passed: true },
  { gate: 'math_render', passed: true },
]

export const CITATION = {
  claimId: 'c1',
  chunkId: '00000000-0000-4000-8000-0000000000c1',
  revisionId: '00000000-0000-4000-8000-0000000000b1',
  page: 12,
  section: 'Définition (fixture)',
  quote: 'exemple synthétique',
}
