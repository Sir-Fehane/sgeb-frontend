import { RouteErrorPresentation } from '@/features/route-errors/components/RouteErrorPresentation'

/**
 * The registered `path: '*'` catch-all route (`routes.ts`) — a real page
 * for any URL that doesn't match a registered route. This is a normal
 * client-navigation outcome, not an application crash and not an
 * SGEB/SSO API error — see `RouteErrorBoundary` for that latter case.
 * Never redirects automatically; the user picks the recovery action.
 */
export function NotFoundPage() {
  return <RouteErrorPresentation variant="not-found" />
}
