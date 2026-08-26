import { Alert } from '@/shared/components'

/**
 * Rendered instead of ever firing `GET /eventos/{id}/participaciones` for a
 * `mesero` session — same "still handle a direct-URL visit honestly,
 * without depending on a real round trip to say so" pattern
 * `UsersForbiddenState`/`WaitersForbiddenState` establish. Team Selection's
 * core write action (`PATCH /participaciones/{id}/estado`) is
 * `capitán`/`admin`-only on the pinned backend
 * (`middleware.rol(['capitan', 'admin'])`); this frontend keeps the whole
 * screen product-scoped to that same pair rather than showing a read-only
 * roster a `mesero` session could never act on.
 */
export function TeamSelectionForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>La selección de equipo está disponible solo para capitanes y administradores.</p>
    </Alert>
  )
}
