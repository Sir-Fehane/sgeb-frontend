import { Alert, Button } from '@/shared/components'

export interface EventAttendanceErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` always renders `tone="danger"` as `role="alert"` (assertive).
 * `errorMessage` must already be a safe, user-facing message — never a
 * raw SGEB `technical_message`. The retry action only renders when a
 * real callback is injected — same pattern as `EventDetailErrorState`/
 * `TeamSelectionErrorState`.
 */
export function EventAttendanceErrorState({
  errorMessage,
  onRetry,
}: EventAttendanceErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el pase de lista">
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
