import { Alert } from '@/shared/components'

/**
 * Rendered instead of the montage roster/checklist/table-assignment content
 * (and instead of ever firing any of that content's queries) for a
 * non-`capitán`/`admin` session — `types/montage.ts`'s own module comment
 * already documents this whole screen as "the CAPTAIN'S WEB VIEW of
 * montage checklists and table assignment," so this is product-scoped away
 * from `mesero` the same way `MenuForbiddenState`/`ChecklistsForbiddenState`
 * scope their own global catalog screens. A `mesero` session never
 * legitimately reaches this web console at all (the native iOS app is the
 * mesero product) — this state exists purely as a defensive backstop for a
 * direct `/eventos/:id/montaje` visit, not an expected real-world path.
 */
export function EventMontageForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>
        El montaje y la asignación de mesas están disponibles solo para capitanes y
        administradores.
      </p>
    </Alert>
  )
}
