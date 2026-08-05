import { IconAlertTriangle } from '@tabler/icons-react'

import { Alert } from '@/shared/components'

/**
 * Rendered when the response's `result.code` is `SGEB-0004` — the
 * documented partial-success case (some sections came back `null`
 * because they couldn't be calculated, not because they were excluded
 * via `secciones`). Uses the exact wording from
 * docs/errors/diccionario-errores-sgeb.md. Polite (`Alert`'s default for
 * a non-`danger` tone) so it doesn't interrupt — the dashboard itself
 * loaded successfully, this is a heads-up, not a failure.
 */
export function DashboardPartialWarning() {
  return (
    <Alert tone="warning" icon={<IconAlertTriangle aria-hidden="true" />}>
      <p>
        Mostramos la información disponible; algunos indicadores no pudieron calcularse.
      </p>
    </Alert>
  )
}
