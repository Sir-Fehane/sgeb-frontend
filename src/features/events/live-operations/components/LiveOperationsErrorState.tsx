import { Alert, Button } from '@/shared/components'

export interface LiveOperationsErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * `Alert` always renders `tone="danger"` as `role="alert"` (assertive).
 * `errorMessage` must already be a safe, user-facing message — never a raw
 * SGEB `technical_message` — same pattern as `TeamSelectionErrorState`.
 */
export function LiveOperationsErrorState({
  errorMessage,
  onRetry,
}: LiveOperationsErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar el control de salida">
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
