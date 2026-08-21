import { Alert, Button } from '@/shared/components'

export interface EventDashboardErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * Global failure state — the whole `GET /eventos/{id}/dashboard` request
 * failed (network error, event not found, forbidden). Distinct from the
 * per-section "No disponible" `EventDashboardSectionCard` renders on a
 * SGEB-0004 partial success: that case still reaches this page with a
 * normal 200 response, so it never hits this component at all.
 */
export function EventDashboardErrorState({
  errorMessage,
  onRetry,
}: EventDashboardErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el panel operativo">
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
