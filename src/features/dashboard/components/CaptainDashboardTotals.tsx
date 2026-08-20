import { Link } from 'react-router-dom'

import type { CaptainDashboardViewModel } from '@/features/dashboard/types/dashboard'
import { CardHeading, Text } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface CaptainDashboardTotalsProps {
  totales: CaptainDashboardViewModel['totales']
  borradores: number
}

interface Tile {
  label: string
  value: number
  href: string
}

/**
 * The four real portfolio counts `GET /dashboard/capitan` returns —
 * `totales.en_curso`/`totales.proximos`/`totales.por_cerrar` plus the
 * top-level `borradores` count. Each tile links to the events list
 * (`/eventos`, the only route that exists for browsing events) rather than
 * a pre-filtered URL: `EventsFilterState` is local component state, not
 * URL-synced (confirmed — no `useSearchParams`/`URLSearchParams` anywhere
 * in `features/events`), so a query-string filter would silently do
 * nothing.
 */
export function CaptainDashboardTotals({
  totales,
  borradores,
}: CaptainDashboardTotalsProps) {
  const tiles: Tile[] = [
    { label: 'En curso', value: totales.enCurso, href: '/eventos' },
    { label: 'Próximos', value: totales.proximos, href: '/eventos' },
    { label: 'Borradores', value: borradores, href: '/eventos' },
    { label: 'Por cerrar', value: totales.porCerrar, href: '/eventos' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          to={tile.href}
          className={cn(
            'border-border bg-card hover:bg-accent flex flex-col gap-1 rounded-lg border p-4',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          )}
        >
          <Text size="sm" className="text-muted-foreground">
            {tile.label}
          </Text>
          <CardHeading className="text-display">{tile.value}</CardHeading>
        </Link>
      ))}
    </div>
  )
}
