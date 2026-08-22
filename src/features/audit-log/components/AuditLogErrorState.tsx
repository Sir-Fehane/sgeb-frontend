import { Alert, Button } from '@/shared/components'

export interface AuditLogErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

export function AuditLogErrorState({ errorMessage, onRetry }: AuditLogErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar la bitácora">
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
