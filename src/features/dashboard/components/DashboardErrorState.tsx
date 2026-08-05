import { Alert, Button } from '@/shared/components'

export interface DashboardErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * Global failure state (e.g. SGEB-5008 — every section failed). Distinct
 * from the per-section "No disponible" rendered by
 * `DashboardSectionUnavailable` on a SGEB-0004 partial success: this
 * replaces the whole dashboard body, no stale section content beneath it.
 */
export function DashboardErrorState({ errorMessage, onRetry }: DashboardErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el panel">
      <p>{errorMessage}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="mt-2 self-start"
        >
          Reintentar
        </Button>
      ) : null}
    </Alert>
  )
}
