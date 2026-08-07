import { Alert, Button, PageTitle, Spinner, Text } from '@/shared/components'

export type OidcCallbackViewState = 'processing' | 'success' | 'error'

export interface OidcCallbackContentProps {
  state: OidcCallbackViewState
  /** Safe, user-facing message only — never a raw provider `error_description` or `sso_code`. Used only when `state === 'error'`. */
  message?: string | undefined
  /**
   * Restarts the authorization flow. Injectable so this component never
   * triggers real navigation itself (mirrors
   * `RouteErrorPresentation`'s `onRetry` pattern) — omit to render no
   * restart action at all.
   */
  onRestart?: (() => void) | undefined
}

const HEADING: Record<OidcCallbackViewState, string> = {
  processing: 'Verificando tu inicio de sesión',
  success: 'Inicio de sesión completado',
  error: 'No pudimos completar el inicio de sesión',
}

/**
 * The one presentational component behind `/auth/callback`. Renders
 * exactly one `<h1>`; the `processing` state's only accessible-status
 * region is `Spinner`'s own built-in `role="status"` — nothing here
 * duplicates it. Structurally cannot render a raw OAuth parameter, a
 * token, or provider stack detail: it has no prop for any of those, only
 * a `state` enum and an already-safe `message` string — mirrors
 * `RouteErrorPresentation`'s "no prop for the original thrown value"
 * design, applied to the OIDC callback instead of route errors.
 */
export function OidcCallbackContent({
  state,
  message,
  onRestart,
}: OidcCallbackContentProps) {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <PageTitle className="text-heading">{HEADING[state]}</PageTitle>

        {state === 'processing' ? (
          <Spinner size="lg" label="Verificando tu inicio de sesión" />
        ) : null}

        {state === 'success' ? (
          <Text className="text-muted-foreground">Te llevamos a tu panel...</Text>
        ) : null}

        {state === 'error' ? (
          <Alert tone="danger" className="w-full text-left">
            <Text size="sm">{message}</Text>
          </Alert>
        ) : null}
      </div>

      {state === 'error' && onRestart ? (
        <Button type="button" onClick={onRestart}>
          Volver a intentar
        </Button>
      ) : null}
    </main>
  )
}
