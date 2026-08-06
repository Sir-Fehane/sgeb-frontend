import { Alert, Button, PageTitle } from '@/shared/components'

export interface PublicDinerErrorStateProps {
  errorMessage: string
  onRetry?: (() => void) | undefined
}

/**
 * A genuine unexpected failure — distinct from
 * `PublicDinerUnavailableState` (a documented, known "mesa not found"
 * outcome). Never renders `technical_message`, a raw `Error.message`, a
 * stack trace, or an invented SGEB code; never redirects automatically.
 */
export function PublicDinerErrorState({
  errorMessage,
  onRetry,
}: PublicDinerErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <PageTitle className="text-heading">Ocurrió un problema</PageTitle>
      <Alert tone="danger" className="w-full text-left">
        <p>{errorMessage}</p>
      </Alert>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
