import { ChecklistTemplatesSection } from '@/features/checklists/components/ChecklistTemplatesSection'
import { ChecklistsForbiddenState } from '@/features/checklists/components/ChecklistsForbiddenState'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { PageTitle, Text } from '@/shared/components'

/**
 * Routed at /checklists — `capitán`/`admin` only on this frontend: a
 * `mesero` session never uses this web console at all (the native iOS app
 * is the mesero product), so this whole administrative catalog screen is
 * product-scoped away from it, same reasoning `MenuPage`/`UsersPage`/
 * `WaitersPage` already apply to their own routes. `NAV_ITEMS` hides the
 * sidebar entry for a `mesero` session
 * (`shared/components/layout/nav-items.ts`); `canView` here is the
 * route-level backstop for a direct `/checklists` visit.
 *
 * The GLOBAL template catalog: reusable `Checklist` templates (montaje/
 * servicio/cierre) and their items, never scoped to a specific event —
 * distinct from `features/events/montage`, which consumes `montaje`
 * templates to build and approve per-participation instances.
 */
export function ChecklistsPage() {
  const session = useOidcSessionStore((state) => state.session)
  const canView =
    session.status === 'authenticated' &&
    (session.user.rol === 'capitan' || session.user.rol === 'admin')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <PageTitle className="text-heading">Checklists</PageTitle>
        <Text size="sm" className="text-muted-foreground">
          Plantillas reutilizables de montaje, servicio y cierre — independientes de
          cualquier evento en particular.
        </Text>
      </div>

      {!canView ? <ChecklistsForbiddenState /> : <ChecklistTemplatesSection />}
    </div>
  )
}
