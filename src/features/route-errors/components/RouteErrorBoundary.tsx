import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { RouteErrorPresentation } from '@/features/route-errors/components/RouteErrorPresentation'

/**
 * The `errorElement` attached to every top-level route in `routes.ts`.
 * Handles errors React Router itself catches while resolving or
 * rendering a route — a thrown `Response`/loader error, a render
 * exception, or a failed `lazy()` module import. This is distinct from
 * an SGEB/SSO API error: no envelope is parsed here, no business code is
 * mapped, and no request is ever made by this component.
 *
 * Distinguishes exactly two outcomes, per the confirmed scope:
 * - A thrown route response with `status: 404` → the same not-found
 *   presentation as the catch-all route (`NotFoundPage`).
 * - Everything else (an `Error`, an unknown thrown value, or any other
 *   route-response status) → one safe, generic "unexpected" presentation.
 *   No 401/403 is special-cased into an authorization/login redirect —
 *   that's a documented non-goal for this branch.
 *
 * Reload is real (`window.location.reload()`), but lives only here, at
 * the boundary — `RouteErrorPresentation` itself only ever receives an
 * injected callback, so it stays fully unit-testable without triggering
 * jsdom navigation.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <RouteErrorPresentation variant="not-found" />
  }

  return (
    <RouteErrorPresentation
      variant="unexpected"
      onRetry={() => {
        window.location.reload()
      }}
    />
  )
}
