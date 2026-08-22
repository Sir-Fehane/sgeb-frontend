import { Alert, Button } from '@/shared/components'

export interface UsersErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

export function UsersErrorState({ errorMessage, onRetry }: UsersErrorStateProps) {
  return (
    <Alert tone="danger" title="No pudimos cargar los usuarios">
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
