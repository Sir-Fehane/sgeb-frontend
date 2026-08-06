import { Alert, Button } from '@/shared/components'

export interface ReportsErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` always renders `tone="danger"` as `role="alert"` (assertive) —
 * appropriate for a failed load. Never renders `technical_message` or a
 * raw `Error.message`; `errorMessage` is expected to already be a
 * user-safe string chosen by the caller.
 */
export function ReportsErrorState({ errorMessage, onRetry }: ReportsErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el reporte">
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
