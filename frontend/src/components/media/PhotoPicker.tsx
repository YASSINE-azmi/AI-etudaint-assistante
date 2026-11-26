import { useEffect, useId, useState, type ChangeEvent } from 'react'

// Same limits as the private `exercise-photos` bucket (§6.5, docs/guides/supabase-setup.md):
// checked here so the student hears about a bad file before any upload.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

function checkPhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Format non accepté. Choisis une photo JPEG, PNG ou WebP.'
  }
  if (file.size > MAX_BYTES) return 'Photo trop lourde : 10 Mo au maximum.'
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

/**
 * Exercise photo selection with preview and type/size checks (§13.3, D-38).
 *
 * TODO(contract): the next steps — `POST /sessions/{id}/media` (returns the storage path),
 * the supabase-js upload, `POST /media/{id}/interpret` and `/confirm` with the ambiguous-symbol
 * dialog — have no response shapes yet, so nothing is uploaded. Owner: Mohamed.
 */
export function PhotoPicker() {
  const inputId = useId()
  const errorId = useId()
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Free the preview's memory when it is replaced, removed, or the page is left.
  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.preview)
  }, [photo])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    if (!chosen) return
    const problem = checkPhoto(chosen)
    setError(problem)
    setPhoto(problem ? null : { file: chosen, preview: URL.createObjectURL(chosen) })
    // Allow picking the same file again after removing it.
    event.target.value = ''
  }

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
        Photo de l’exercice (JPEG, PNG ou WebP, 10 Mo au maximum)
      </label>
      <input
        id={inputId}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="block w-full text-sm text-ink file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-control file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-ink"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-semibold text-warm">
          {error}
        </p>
      ) : null}
      {photo ? (
        <figure className="space-y-2">
          <img
            src={photo.preview}
            alt="Aperçu de la photo choisie"
            className="max-h-64 rounded-xl border border-line object-contain"
          />
          <figcaption className="text-xs text-muted">
            {photo.file.name} — l’envoi pour lecture n’est pas encore disponible.
          </figcaption>
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="min-h-11 rounded-xl border border-control px-4 text-sm font-semibold text-ink hover:bg-paper"
          >
            Retirer la photo
          </button>
        </figure>
      ) : null}
    </div>
  )
}
