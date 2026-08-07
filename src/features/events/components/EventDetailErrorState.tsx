import { Alert, Button } from '@/shared/components'

export interface EventDetailErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` always renders `tone="danger"` as `role="alert"` (assertive) —
 * appropriate for a failed load. `errorMessage` must already be a safe,
 * user-facing message — never a raw SGEB `technical_message`. The retry
 * action only renders when a real callback is injected; this component
 * never fakes network behavior on its own — same pattern as
 * `EventsErrorState`.
 */
export function EventDetailErrorState({
  errorMessage,
  onRetry,
}: EventDetailErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el evento">
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
