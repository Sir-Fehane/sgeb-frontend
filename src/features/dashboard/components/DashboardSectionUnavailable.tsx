import { Text } from '@/shared/components'

/**
 * Renders whenever a `DashboardCapitan` section arrives as `null` —
 * either because it was excluded via the `secciones` query parameter or
 * because it failed to compute (SGEB-0004 partial success). Never a
 * spinner: a `null` section is a final, known state, not a pending one.
 */
export function DashboardSectionUnavailable() {
  return (
    <Text size="sm" className="text-muted-foreground">
      No disponible.
    </Text>
  )
}
