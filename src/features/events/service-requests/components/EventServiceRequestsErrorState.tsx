import { Alert, Button } from '@/shared/components'

export interface EventServiceRequestsErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

export function EventServiceRequestsErrorState({
  errorMessage,
  onRetry,
}: EventServiceRequestsErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar las solicitudes">
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
