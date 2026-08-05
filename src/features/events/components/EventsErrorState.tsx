import { Alert, Button } from '@/shared/components'

export interface EventsErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` defaults to `role="status"` for non-`danger` tones — this
 * always uses `tone="danger"`, which `Alert` itself always renders as
 * `role="alert"` (assertive), appropriate for a failed load.
 */
export function EventsErrorState({ errorMessage, onRetry }: EventsErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar los eventos">
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
