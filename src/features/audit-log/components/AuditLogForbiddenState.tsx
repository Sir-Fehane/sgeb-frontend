import { Alert } from '@/shared/components'

/**
 * Rendered instead of ever firing `GET /admin/bitacora` for a non-admin
 * session (`AuditLogPage`'s own role check) — mirrors this branch's
 * instruction to "still handle 403/SGEB-1004 honestly" for an admin-only
 * page a non-admin session reaches directly by URL, without depending on a
 * real round trip to say so. `NAV_ITEMS` already hides the sidebar entry
 * for this route (`shared/components/layout/nav-items.ts`); this is the
 * route-level backstop for a direct visit.
 */
export function AuditLogForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>La Bitácora del sistema está disponible solo para administradores.</p>
    </Alert>
  )
}
