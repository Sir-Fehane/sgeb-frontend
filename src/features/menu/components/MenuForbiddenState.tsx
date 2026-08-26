import { Alert } from '@/shared/components'

/**
 * Rendered instead of the catalog tabs (and instead of ever firing any of
 * their queries) for a `mesero` session — same "still handle a direct-URL
 * visit honestly, without depending on a real round trip to say so" pattern
 * `UsersForbiddenState`/`WaitersForbiddenState` establish. `NAV_ITEMS`
 * already hides the "Bebidas y Cubaitor" sidebar entry
 * (`shared/components/layout/nav-items.ts`); this is the route-level
 * backstop for a direct `/menu` visit. A `mesero` session never legitimately
 * reaches this web console at all (the native iOS app is the mesero
 * product, docs/FrontendArchitecture.md §2/§10.3) — this state exists purely
 * as a defensive backstop, not an expected real-world path.
 */
export function MenuForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>
        El catálogo de Bebidas y Cubaitor está disponible solo para capitanes y
        administradores.
      </p>
    </Alert>
  )
}
