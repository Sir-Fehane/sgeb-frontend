import {
  IconActivity,
  IconCalendarEvent,
  IconChartBar,
  IconCurrencyDollar,
  IconGlassFull,
  IconLayoutDashboard,
  IconUserCheck,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'

/**
 * The minimal prop surface `NavItem` actually passes to an icon
 * component. Deliberately narrower than Tabler's own `IconProps` (rather
 * than reusing `SVGProps<SVGSVGElement>`) since Tabler's `stroke` field
 * isn't `undefined`-compatible under `exactOptionalPropertyTypes`.
 */
export interface NavIconProps {
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

interface NavItemBase {
  id: string
  label: string
  icon: ComponentType<NavIconProps>
}

/** A confirmed, navigable destination. */
export interface AvailableNavItemConfig extends NavItemBase {
  status: 'available'
  href: string
}

/**
 * A wireframe nav item whose top-level route is not yet approved in
 * docs/FrontendArchitecture.md. Deliberately has no `href` at all —
 * inventing a placeholder slug would itself be an unapproved
 * information-architecture decision, not just a naming detail.
 */
export interface PendingNavItemConfig extends NavItemBase {
  status: 'route-pending'
  href: null
}

/**
 * A discriminated union (rather than a flat `href: string | null` +
 * `status` pair) so `item.href` is statically guaranteed to be a
 * non-null `string` wherever `item.status === 'available'`, and `null`
 * wherever it's `'route-pending'` — the two fields can't drift apart.
 */
export type NavItemConfig = AvailableNavItemConfig | PendingNavItemConfig

/**
 * The authenticated sidebar navigation, per the captain wireframes
 * (docs/design/Diseño Web.pdf — Panel · Eventos · Meseros · Operación en
 * vivo · Bebidas y Cubaitor · Pagos · Reportes). Shared by `admin` and
 * `capitan` — both sit in this one app (docs/FrontendArchitecture.md §2).
 *
 * No role filtering is applied here yet; this type intentionally has
 * room to grow (e.g. an optional `roles` field) once real role-based
 * access is designed — do not add that field speculatively ahead of
 * that decision.
 *
 * Icons are chosen from docs/branding/branding.pdf's "Sistema de
 * iconografía" table where a row matches directly (Meseros, Bebidas,
 * Pagos, Reportes). The branding table has no row for "Panel",
 * "Eventos", or "Operación en vivo" — those three use the closest
 * reasonable Tabler icon instead of a documented one; flag with design
 * if a different icon is intended.
 *
 * Route status: "Panel", "Eventos", "Meseros", "Reportes", and now
 * "Bebidas y Cubaitor" (`feature/cubaitor-orders-live`) have a top-level
 * route and are `status: 'available'`. The remaining two are
 * `status: 'route-pending'` with `href: null` — their eventual information
 * architecture is a real open question, not a naming detail this frontend
 * gets to decide:
 *   - "Operación en vivo" needed an active-event context, confirmed by
 *     `feature/live-operations-participant-exit`: it is now a real,
 *     registered route — but only the event-scoped
 *     `/eventos/:id/operacion-en-vivo` (reached from Event Detail's
 *     roadmap section, `EventDetailRoadmapSection`), never a standalone
 *     top-level one. This sidebar entry deliberately stays
 *     `route-pending`/`href: null`: there is no event context here to
 *     build a static `href` from — exactly the same situation "Pagos"
 *     (below) already resolved the same way once `/eventos/:id/pagos`
 *     shipped.
 *   - "Pagos" is only documented nested as `/eventos/:id/pagos` (already
 *     registered) — a global cross-event view may or may not be built;
 *     until it is, this entry correctly stays `route-pending` even though
 *     a real nested route exists.
 *
 * "Bebidas y Cubaitor" resolution (`feature/cubaitor-orders-live`): the
 * global catalog (`/menu` — Bebidas/Insumos/Envases/recetas + the Cubaitor
 * device fleet) is confirmed global-scoped against the pinned backend (no
 * `id_evento` on any of those models), so this ONE sidebar entry points
 * there, matching the single nav slot rather than fragmenting into two
 * top-level items. The event-scoped live bar operation (orders, dispensing,
 * a specific event's pin configuration) is a SEPARATE surface at
 * `/eventos/:id/cubaitor`, reached from Event Detail's roadmap section, not
 * from this global sidebar — same "global catalog vs. event-scoped
 * operation" split "Operación en vivo"/"Pagos" already established above. A
 * standalone `/cubaitor` top-level route (for the device fleet alone) was
 * considered and deliberately not added: it would fragment this one nav
 * slot into two without a confirmed product need.
 *
 * Do not invent a temporary slug for a `route-pending` entry — see
 * `NavItem` for how one renders (visible, labeled "Ruta pendiente",
 * non-interactive).
 */
export const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: 'panel',
    label: 'Panel',
    status: 'available',
    href: '/panel',
    icon: IconLayoutDashboard,
  },
  {
    id: 'eventos',
    label: 'Eventos',
    status: 'available',
    href: '/eventos',
    icon: IconCalendarEvent,
  },
  {
    id: 'meseros',
    label: 'Meseros',
    status: 'available',
    href: '/meseros',
    icon: IconUserCheck,
  },
  {
    id: 'operacion-en-vivo',
    label: 'Operación en vivo',
    status: 'route-pending',
    href: null,
    icon: IconActivity,
  },
  {
    id: 'bebidas-cubaitor',
    label: 'Bebidas y Cubaitor',
    status: 'available',
    href: '/menu',
    icon: IconGlassFull,
  },
  {
    id: 'pagos',
    label: 'Pagos',
    status: 'route-pending',
    href: null,
    icon: IconCurrencyDollar,
  },
  {
    id: 'reportes',
    label: 'Reportes',
    status: 'available',
    href: '/reportes',
    icon: IconChartBar,
  },
]
