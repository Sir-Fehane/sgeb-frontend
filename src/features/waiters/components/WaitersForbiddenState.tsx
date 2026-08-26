import { Alert } from '@/shared/components'

/**
 * Rendered instead of ever firing `GET /usuarios?rol=mesero` for a `mesero`
 * session — same "still handle a direct-URL visit honestly, without
 * depending on a real round trip to say so" pattern `UsersForbiddenState`/
 * `AuditLogForbiddenState` establish. `NAV_ITEMS` already hides the sidebar
 * entry for this route (`shared/components/layout/nav-items.ts`); this is
 * the route-level backstop for a direct visit. A `mesero` session never
 * legitimately reaches this web console at all (the native iOS app is the
 * mesero product, docs/FrontendArchitecture.md §2/§10.3) — this state exists
 * purely as a defensive backstop, not an expected real-world path.
 */
export function WaitersForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>La sección Meseros está disponible solo para capitanes y administradores.</p>
    </Alert>
  )
}
