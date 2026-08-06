import { Button, PageTitle, Text } from '@/shared/components'

export interface PublicDinerUnavailableStateProps {
  /** Optional safe retry action — omit to render no retry control at all. */
  onRetry?: (() => void) | undefined
}

/**
 * The mesa resource itself is unavailable (invalid/expired QR code, or a
 * documented `404`) — conceptually distinct from the app-wide
 * route-not-found catch-all (`features/route-errors`): the frontend
 * route matched and rendered correctly, it's the *mesa* that couldn't be
 * found. Never renders the raw `codigoQr`, never claims a permissions
 * problem, never links to the captain console or `/login`.
 */
export function PublicDinerUnavailableState({
  onRetry,
}: PublicDinerUnavailableStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <PageTitle className="text-heading">No encontramos esta mesa</PageTitle>
      <Text size="sm" className="text-muted-foreground">
        Revisa el enlace del código QR o solicita ayuda al personal.
      </Text>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
