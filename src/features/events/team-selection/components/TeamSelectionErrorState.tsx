import { Alert, Button } from '@/shared/components'

export interface TeamSelectionErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` always renders `tone="danger"` as `role="alert"` (assertive).
 * `errorMessage` must already be a safe, user-facing message — never a
 * raw SGEB `technical_message`. The retry action only renders when a
 * real callback is injected — same pattern as `EventDetailErrorState`.
 */
export function TeamSelectionErrorState({
  errorMessage,
  onRetry,
}: TeamSelectionErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el equipo">
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
