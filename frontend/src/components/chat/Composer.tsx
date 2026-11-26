import { useId, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'

// §6.5: max prompt length.
const MAX_PROMPT_CHARS = 4000

type ComposerProps = {
  busy: boolean
  onSubmit: (text: string) => void
  onStop: () => void
}

/** Question field with Send, and Stop while a turn runs (§13.3). */
export function Composer({ busy, onSubmit, onStop }: ComposerProps) {
  const fieldId = useId()
  const hintId = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')

  function submit() {
    const prompt = text.trim()
    if (!prompt || busy) return
    onSubmit(prompt)
    setText('')
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
    }
  }

  function stop() {
    onStop()
    // The Stop button disappears; keep keyboard users in the question field.
    field.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-semibold text-ink">
        Ta question
      </label>
      <textarea
        id={fieldId}
        ref={field}
        name="prompt"
        rows={3}
        maxLength={MAX_PROMPT_CHARS}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-describedby={hintId}
        className="block w-full resize-y rounded-xl border border-control bg-surface px-3 py-2 text-base leading-7 text-ink focus:border-accent"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={hintId} className="text-xs text-muted">
          Ctrl + Entrée pour envoyer · {text.length} / {MAX_PROMPT_CHARS} caractères
        </p>
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex min-h-11 items-center rounded-xl bg-warm px-5 text-sm font-semibold text-surface hover:bg-ink"
          >
            Arrêter
          </button>
        ) : (
          <button
            type="submit"
            disabled={text.trim() === ''}
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-surface hover:bg-ink disabled:opacity-60"
          >
            Envoyer
          </button>
        )}
      </div>
    </form>
  )
}
