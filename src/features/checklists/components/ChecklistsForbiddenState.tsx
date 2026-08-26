import { Alert } from '@/shared/components'

/**
 * Rendered instead of the template catalog (and instead of ever firing its
 * query) for a `mesero` session — same pattern as `MenuForbiddenState`/
 * `UsersForbiddenState`. `NAV_ITEMS` already hides the "Checklists" sidebar
 * entry (`shared/components/layout/nav-items.ts`); this is the route-level
 * backstop for a direct `/checklists` visit. A `mesero` session never
 * legitimately reaches this web console at all (the native iOS app is the
 * mesero product) — this state exists purely as a defensive backstop.
 */
export function ChecklistsForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>
        El catálogo de plantillas de checklist está disponible solo para capitanes y
        administradores.
      </p>
    </Alert>
  )
}
