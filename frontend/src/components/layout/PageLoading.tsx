/** Fallback while a route's code chunk loads. */
export function PageLoading() {
  return (
    <p role="status" className="text-sm text-muted">
      Chargement de la page…
    </p>
  )
}
