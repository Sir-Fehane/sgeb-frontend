import { Caption, PageTitle, Text } from '@/shared/components'

export interface PublicDinerHeaderProps {
  etiqueta: string
  eventoTitulo: string
}

/**
 * The one `<h1>` for this route — `etiqueta` (the table label), per the
 * documented content hierarchy: brand identity (decorative), then the
 * table label as the main context, then the event title. No mesero name
 * here: `GET /publico/mesas/{codigo_qr}`'s actual response
 * (`PublicoController#mesa`) never sends one — its own doc comment is
 * explicit that this view exists precisely so an anonymous request never
 * learns "datos del mesero." `eventoTitulo` is shown because the same
 * comment draws the line at the event, not the table, as the boundary of
 * what's safe to expose ("nunca... datos del mesero, ni del evento más
 * allá del título"). No avatar, no fake online status, no other
 * event/venue metadata beyond that.
 *
 * Deliberately a plain `<div>`, not a `<header>`: this codebase's
 * `<header>` elements resolve to the `banner` landmark role (see
 * `AppShell`'s `Topbar`) — a brief decorative identity strip on a
 * single-purpose mobile page has nothing worth landmark-navigating past,
 * so it doesn't need its own landmark region.
 */
export function PublicDinerHeader({ etiqueta, eventoTitulo }: PublicDinerHeaderProps) {
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
        {eventoTitulo}
      </Text>
    </div>
  )
}
