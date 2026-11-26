import { useState } from 'react'

import { useRecorder, type RecorderState } from '@/components/media/useRecorder'

const STATUS_FR: Record<RecorderState, string> = {
  idle: 'Micro inactif.',
  requesting: 'Autorisation du micro en attente…',
  recording: 'Enregistrement en cours… Appuie sur « Arrêter l’enregistrement » pour finir.',
  denied:
    'L’accès au micro est refusé. Autorise-le dans les réglages du navigateur, ou écris ta question.',
  unavailable: 'Ce navigateur ne permet pas l’enregistrement audio. Écris ta question.',
  error: 'Aucun micro utilisable n’a été trouvé. Écris ta question.',
}

/**
 * Push-to-talk button (§2.3): one press to start, one to stop; no continuous listening.
 *
 * TODO(contract): `POST /api/v1/speech/transcribe` (§7.1, ADR 0003) has no request format
 * (multipart field name, accepted audio types, max duration) or response shape yet, so the
 * recording is discarded and no editable transcript is produced. Owner: Mohamed.
 */
export function PushToTalk() {
  const [recorded, setRecorded] = useState(false)
  // The Blob is dropped on purpose: raw audio is never kept (§14), and there is nowhere to send it.
  const { state, start, stop } = useRecorder(() => setRecorded(true))
  const active = state === 'recording' || state === 'requesting'

  return (
    <div className="space-y-2" data-recorder-state={state}>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => {
          if (active) {
            stop()
          } else {
            setRecorded(false)
            void start()
          }
        }}
        className={[
          'inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold',
          active ? 'bg-warm text-surface hover:bg-ink' : 'bg-accent text-surface hover:bg-ink',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={['size-2 rounded-full bg-surface', active ? 'animate-pulse' : ''].join(' ')}
        />
        {active ? 'Arrêter l’enregistrement' : 'Parler'}
      </button>
      <p role="status" className="text-sm text-muted">
        {STATUS_FR[state]}
      </p>
      {recorded && state === 'idle' ? (
        <p className="text-sm text-muted">
          Enregistrement terminé. La transcription n’est pas encore disponible ; l’audio n’a pas
          été conservé.
        </p>
      ) : null}
    </div>
  )
}
