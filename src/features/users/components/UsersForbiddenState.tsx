import { Alert } from '@/shared/components'

/**
 * Rendered instead of ever firing `GET /usuarios` for a non-admin session
 * (`UsersPage`'s own role check) — same "still handle a direct-URL visit
 * honestly, without depending on a real round trip to say so" pattern
 * `AuditLogForbiddenState` establishes for `/bitacora`. `NAV_ITEMS` already
 * hides the sidebar entry for this route
 * (`shared/components/layout/nav-items.ts`); this is the route-level
 * backstop for a direct visit — the backend's own
 * `middleware.rol(['capitan', 'admin'])` would still permit a `capitan`
 * session to call `GET /usuarios`, but "Usuarios" is product-scoped to
 * `admin` alone on this frontend.
 */
export function UsersForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>La sección Usuarios está disponible solo para administradores.</p>
    </Alert>
  )
}
