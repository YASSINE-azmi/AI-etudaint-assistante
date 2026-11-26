import { useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'denied' | 'unavailable' | 'error'

function releaseMicrophone(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) track.stop()
}

/**
 * Push-to-talk capture (§2.3, §13.3): starts only on an explicit press, never listens
 * continuously, and stops the microphone synchronously so capture ends well under 500 ms.
 * The audio stays in memory for `onRecorded` and is never persisted by the browser.
 */
export function useRecorder(onRecorded: (audio: Blob) => void) {
  const [state, setState] = useState<RecorderState>('idle')
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const cancelled = useRef(false)
  const onRecordedRef = useRef(onRecorded)

  useEffect(() => {
    onRecordedRef.current = onRecorded
  })

  // Leaving the page must release the microphone.
  useEffect(
    () => () => {
      cancelled.current = true
      if (recorder.current?.state === 'recording') recorder.current.stop()
      releaseMicrophone(stream.current)
    },
    [],
  )

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('unavailable')
      return
    }
    cancelled.current = false
    setState('requesting')
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
      return
    }
    // Stop was pressed while the permission prompt was open.
    if (cancelled.current) {
      releaseMicrophone(media)
      setState('idle')
      return
    }

    const chunks: Blob[] = []
    const capture = new MediaRecorder(media)
    capture.ondataavailable = (event) => chunks.push(event.data)
    capture.onstop = () => {
      const audio = new Blob(chunks, { type: capture.mimeType })
      if (audio.size > 0) onRecordedRef.current(audio)
    }
    stream.current = media
    recorder.current = capture
    capture.start()
    setState('recording')
  }

  /** Synchronous: the microphone is released before this returns. */
  function stop() {
    cancelled.current = true
    if (recorder.current?.state === 'recording') recorder.current.stop()
    releaseMicrophone(stream.current)
    stream.current = null
    recorder.current = null
    setState('idle')
  }

  return { state, start, stop }
}
