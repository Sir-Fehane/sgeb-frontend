import { Spinner } from '@/shared/components'

/**
 * The `hydrateFallbackElement` attached to every top-level route in
 * `routes.ts`. Every route here is registered via route-level `lazy()`
 * (docs/FrontendArchitecture.md §17's established pattern) — without a
 * fallback, React Router logs "No `HydrateFallback` element provided to
 * render during initial hydration" and renders nothing while the
 * initially-matched route's module is still loading. This is a pure
 * loading placeholder: no stale content, no error state, and exactly one
 * accessible status region — `Spinner` already provides `role="status"`
 * with its own screen-reader-only label, so nothing here duplicates it.
 */
export function RouteHydrateFallback() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <Spinner size="lg" label="Cargando la aplicación" />
    </div>
  )
}
