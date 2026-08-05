import type {
  WaiterListItemViewModel,
  WaitersFilterState,
} from '@/features/waiters/types/waiter'

/**
 * Pure, local filtering over an in-memory `WaiterListItemViewModel[]` —
 * demonstrates the one documented, applicable `GET /usuarios` query
 * dimension (`activo`) entirely client-side. UI behavior over
 * fixture/prop data only; performs no network call.
 */
export function filterWaiters(
  waiters: readonly WaiterListItemViewModel[],
  filters: WaitersFilterState,
): WaiterListItemViewModel[] {
  return waiters.filter((waiter) => {
    if (
      filters.estadoCuenta !== 'todos' &&
      waiter.estadoCuenta !== filters.estadoCuenta
    ) {
      return false
    }
    return true
  })
}
