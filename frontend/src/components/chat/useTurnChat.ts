import { useChat } from '@ai-sdk/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ApiError } from '@/lib/http'
import {
  createTurnTransport,
  newIdempotencyKey,
  readTurn,
  type TurnMessage,
  type TurnSubmission,
} from '@/lib/sse'

const GENERIC_ERROR_FR = 'La question n’a pas pu être envoyée. Réessaie dans un instant.'

export type TurnError = { messageFr: string; retryable: boolean }

function toTurnError(error: Error): TurnError {
  if (!(error instanceof ApiError)) return { messageFr: GENERIC_ERROR_FR, retryable: true }
  // 0 = network/timeout, 429 = RATE_LIMITED (retry after a wait), 5xx = server/provider.
  const retryable = error.status === 0 || error.status === 429 || error.status >= 500
  return { messageFr: error.messageFr, retryable }
}

/**
 * One classroom session's turns (§13.3): one Idempotency-Key per submission, reused on retry;
 * Stop aborts the stream at once and freezes the stopped turn so nothing it later carries is
 * shown (stale events, §2.6).
 */
export function useTurnChat(sessionId: string) {
  const transport = useMemo(() => createTurnTransport(sessionId), [sessionId])
  const chat = useChat<TurnMessage>({ id: sessionId, transport })
  const [interrupted, setInterrupted] = useState<ReadonlySet<string>>(() => new Set())
  const [stopped, setStopped] = useState(false)
  const lastKey = useRef<string | null>(null)
  const stopChat = useRef(chat.stop)

  // Leaving the page (route change, logout) must not leave a turn streaming in the background.
  useEffect(() => {
    stopChat.current = chat.stop
  })
  useEffect(() => () => void stopChat.current(), [])

  const busy = !stopped && (chat.status === 'submitted' || chat.status === 'streaming')

  // While `chat.stop()` settles, the SDK still counts a request in progress and may queue a new
  // message instead of sending it. Waiting for the stop keeps the next request a plain send.
  const pendingStop = useRef<Promise<void>>(Promise.resolve())

  async function submit(text: string) {
    if (busy) return
    const idempotencyKey = newIdempotencyKey()
    lastKey.current = idempotencyKey
    await pendingStop.current
    setStopped(false)
    const body: TurnSubmission = { idempotencyKey }
    await chat.sendMessage({ text }, { body })
  }

  async function retry() {
    if (busy || !lastKey.current) return
    await pendingStop.current
    setStopped(false)
    chat.clearError()
    await chat.regenerate({ body: { idempotencyKey: lastKey.current } })
  }

  function stop() {
    if (!busy) return
    // The UI stops now (synchronously), before the abort settles (§13.3: < 500 ms).
    setStopped(true)
    const last = chat.messages.at(-1)
    // A turn that already delivered its validated text keeps it; anything else is frozen.
    if (last && (last.role === 'user' || readTurn(last).text === null)) {
      setInterrupted((previous) => new Set(previous).add(last.id))
    }
    pendingStop.current = chat.stop()
    // TODO(contract): also call `POST /sessions/{id}/interrupt` (§7.1, §13.3). Its request and
    // response are not defined yet (e2e-matrix V5). Owner: Mohamed.
  }

  return {
    messages: chat.messages,
    busy,
    error: chat.error && !stopped ? toTurnError(chat.error) : null,
    interrupted,
    submit: (text: string) => void submit(text),
    retry: () => void retry(),
    stop,
  }
}
