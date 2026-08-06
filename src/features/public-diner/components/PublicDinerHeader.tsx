import { Caption, PageTitle, Text } from '@/shared/components'

export interface PublicDinerHeaderProps {
  etiqueta: string
  mesero: string
}

/**
 * The one `<h1>` for this route — `etiqueta` (the table label), per the
 * documented content hierarchy: brand identity (decorative), then the
 * table label as the main context, then the assigned waiter's name. No
 * avatar (no approved photo source), no fake online status, no
 * event/venue metadata — none of that is part of the documented mesa
 * response.
 *
 * Deliberately a plain `<div>`, not a `<header>`: this codebase's
 * `<header>` elements resolve to the `banner` landmark role (see
 * `AppShell`'s `Topbar`) — a brief decorative identity strip on a
 * single-purpose mobile page has nothing worth landmark-navigating past,
 * so it doesn't need its own landmark region.
 */
export function PublicDinerHeader({ etiqueta, mesero }: PublicDinerHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        aria-hidden="true"
        className="bg-foreground text-background flex size-10 shrink-0 items-center justify-center rounded-lg font-heading text-body font-bold"
      >
        SG
      </span>
      <Caption>SGEB</Caption>
      <PageTitle className="text-heading">{etiqueta}</PageTitle>
      <Text size="sm" className="text-muted-foreground">
        Te atiende: {mesero}
      </Text>
    </div>
  )
}
