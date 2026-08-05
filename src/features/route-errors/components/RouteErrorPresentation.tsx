import { Link } from 'react-router-dom'

import { Alert, Button, PageTitle, Text } from '@/shared/components'

export type RouteErrorVariant = 'not-found' | 'unexpected'

export interface RouteErrorPresentationProps {
  variant: RouteErrorVariant
  /**
   * Additional plain-language context — never raw `Error.message`, a
   * stack trace, a file path, or a `technical_message`. Optional; both
   * variants read fine without it.
   */
  secondaryText?: string
  /** Recovery destination for the primary action. Defaults to `/panel`, the app's stable home. */
  primaryActionTo?: string
  /**
   * Invoked by the optional "Reintentar" action, when supplied. Omit to
   * not render a retry action at all (the not-found variant has nothing
   * to retry). Injectable so callers control what "retry" means (e.g. a
   * real `window.location.reload()` at the boundary) without this
   * component ever triggering navigation itself — keeps it fully
   * testable without jsdom navigation warnings.
   */
  onRetry?: () => void
}

const COPY: Record<RouteErrorVariant, { heading: string; message: string }> = {
  'not-found': {
    heading: 'Página no encontrada',
    message: 'No encontramos la página que buscas.',
  },
  unexpected: {
    heading: 'No pudimos abrir esta página',
    message: 'Ocurrió un problema inesperado al mostrar el contenido.',
  },
}

/**
 * The one reusable presentation for both route-level failure states —
 * "not found" (a normal client-navigation outcome) and "unexpected"
 * (React Router failed to resolve/render a route). Deliberately has no
 * prop for the original thrown value/message: neither variant can ever
 * render raw error text, a stack trace, or a `technical_message` — see
 * `RouteErrorBoundary` for where the thrown value is inspected and
 * discarded down to just a `variant`.
 *
 * Renders its own full `<main>` — this is intentionally independent of
 * `AppShell`/`AuthLayout` (no sidebar, no auth session assumption), since
 * a route failure must render correctly regardless of which layout (or
 * none) the failing route belonged to.
 */
export function RouteErrorPresentation({
  variant,
  secondaryText,
  primaryActionTo = '/panel',
  onRetry,
}: RouteErrorPresentationProps) {
  const { heading, message } = COPY[variant]

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <PageTitle className="text-heading">{heading}</PageTitle>

        {variant === 'unexpected' ? (
          <Alert tone="danger" className="w-full text-left">
            <Text size="sm">{message}</Text>
            {secondaryText ? (
              <Text size="sm" className="mt-1">
                {secondaryText}
              </Text>
            ) : null}
          </Alert>
        ) : (
          <>
            <Text className="text-muted-foreground">{message}</Text>
            {secondaryText ? (
              <Text size="sm" className="text-muted-foreground">
                {secondaryText}
              </Text>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to={primaryActionTo}>Volver al panel</Link>
        </Button>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </div>
    </main>
  )
}
