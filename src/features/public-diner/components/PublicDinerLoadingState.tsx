import { Spinner } from '@/shared/components'

/**
 * `role="status"` via `Spinner` itself — the one accessible status
 * region for this route. No table fixture and no actions render
 * underneath while loading.
 */
export function PublicDinerLoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner size="lg" label="Cargando información de la mesa" />
    </div>
  )
}
