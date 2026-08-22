import {
  IconCalendarEvent,
  IconChartBar,
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

/**
 * A confirmed, navigable top-level destination — the only kind of entry
 * this sidebar renders (`feature/app-shell-hardening` removed the
 * `route-pending`/no-`href` variant this type used to be one half of, once
 * its last two consumers were removed from `NAV_ITEMS` below — see
 * `NavItem` for the corresponding rendering simplification).
 */
export interface NavItemConfig {
  id: string
  label: string
  href: string
  icon: ComponentType<NavIconProps>
}

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
 * Pagos, Reportes). The branding table has no row for "Panel" or
 * "Eventos" — those two use the closest reasonable Tabler icon instead of
 * a documented one; flag with design if a different icon is intended.
 *
 * Every entry below is a confirmed, navigable top-level route.
 * "Operación en vivo" and "Pagos" were REMOVED from this list entirely on
 * `feature/app-shell-hardening` — both stay real, but only as the
 * event-scoped `eventos/:id/operacion-en-vivo`/`eventos/:id/pagos`
 * children reached from Event Detail's roadmap
 * (`EventDetailRoadmapSection`), never from this global sidebar. Neither
 * has a confirmed cross-event destination to build a top-level `href`
 * from; inventing one just to fill this sidebar slot would be an
 * unapproved information-architecture decision, not a routing detail —
 * the misleading "Ruta pendiente" placeholder they previously showed here
 * was removed for the same reason (see `routes.tsx`'s own comment). If a
 * genuine global destination is ever confirmed for either, it belongs
 * here as a plain entry like every other one below — not a resurrected
 * pending placeholder.
 */
export const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: 'panel',
    label: 'Panel',
    href: '/panel',
    icon: IconLayoutDashboard,
  },
  {
    id: 'eventos',
    label: 'Eventos',
    href: '/eventos',
    icon: IconCalendarEvent,
  },
  {
    id: 'meseros',
    label: 'Meseros',
    href: '/meseros',
    icon: IconUserCheck,
  },
  {
    id: 'bebidas-cubaitor',
    label: 'Bebidas y Cubaitor',
    href: '/menu',
    icon: IconGlassFull,
  },
  {
    id: 'reportes',
    label: 'Reportes',
    href: '/reportes',
    icon: IconChartBar,
  },
]
